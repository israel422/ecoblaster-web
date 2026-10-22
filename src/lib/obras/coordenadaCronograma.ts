import { neon } from "@neondatabase/serverless";

// Coordenada de cada obra na planilha CRONOGRAMA DE OBRAS - CELPE (aba CONSTRUÇÃO, compartilhada
// por link): F = SAP, AJ = latitude, AK = longitude. É o plano B quando a foto fica sem GPS —
// em hipótese alguma uma foto de cava fica sem coordenada.
// Todo dia às 5h (cron /api/cron/coordenadas) a lista é copiada para a tabela obras_coordenadas;
// o app consulta essa cópia (não depende da planilha na hora da foto).
const PLANILHA = process.env.CRONOGRAMA_ID || "15dvHw_RSdy-fovCuECMSe9CI3UYSNmUeyO7u-9qs9W0";
const GID = process.env.CRONOGRAMA_GID || "1196101802";
const URL_CSV = `https://docs.google.com/spreadsheets/d/${PLANILHA}/export?format=csv&gid=${GID}`;
const COL_SAP = 5, COL_LAT = 35, COL_LON = 36;
const VELHA_HORAS = 36; // cópia mais velha que isso (cron falhou): atualiza na hora

const sql = neon(process.env.DATABASE_URL!);
let tabelaPronta: Promise<unknown> | null = null;
const garantirTabela = () =>
  (tabelaPronta ??= sql`CREATE TABLE IF NOT EXISTS obras_coordenadas (
    codigo text PRIMARY KEY,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    atualizado_em timestamptz NOT NULL DEFAULT now()
  )`.catch((e) => {
    tabelaPronta = null;
    throw e;
  }));

export const chaveObra = (codigo: string) => codigo.replace(/\D/g, "").replace(/^0+/, "");

async function lerPlanilha(): Promise<Map<string, [number, number]>> {
  const r = await fetch(URL_CSV, { cache: "no-store" });
  if (!r.ok) throw new Error(`Google respondeu ${r.status}`);
  const texto = await r.text();
  if (texto.trimStart().startsWith("<")) throw new Error("cronograma sem acesso por link");
  const mapa = new Map<string, [number, number]>();
  for (const l of lerCsv(texto).slice(1)) {
    const sap = chaveObra(l[COL_SAP] ?? "");
    const lat = Number((l[COL_LAT] ?? "").trim().replace(",", "."));
    const lon = Number((l[COL_LON] ?? "").trim().replace(",", "."));
    // só Pernambuco (descarta "-", vazio e coordenada trocada)
    if (!sap || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -10 || lat > -6.5 || lon < -42 || lon > -34) continue;
    if (!mapa.has(sap)) mapa.set(sap, [lat, lon]);
  }
  return mapa;
}

// Copia a planilha para o banco (substitui a lista inteira). Usado pelo cron das 5h.
export async function atualizarCoordenadas(): Promise<{ obras: number }> {
  await garantirTabela();
  const mapa = await lerPlanilha();
  if (mapa.size < 100) throw new Error(`cronograma veio com só ${mapa.size} obras — cópia mantida`);
  const codigos = [...mapa.keys()];
  const lats = codigos.map((c) => mapa.get(c)![0]);
  const lons = codigos.map((c) => mapa.get(c)![1]);
  await sql.transaction([
    sql`DELETE FROM obras_coordenadas`,
    sql`INSERT INTO obras_coordenadas (codigo, lat, lon)
        SELECT * FROM unnest(${codigos}::text[], ${lats}::float8[], ${lons}::float8[])`,
  ]);
  return { obras: codigos.length };
}

// Garante que a cópia existe e não está velha (se o cron falhou, atualiza agora)
async function copiaEmDia() {
  await garantirTabela();
  const [r] = await sql`SELECT count(*)::int AS n, max(atualizado_em) AS em FROM obras_coordenadas`;
  const velha = !r?.n || Date.now() - new Date(r.em).getTime() > VELHA_HORAS * 3600_000;
  if (velha) await atualizarCoordenadas().catch((err) => console.error("Falha ao atualizar coordenadas do cronograma:", err));
}

export async function coordenadaDaObra(codigo: string): Promise<{ lat: number; lon: number } | null> {
  try {
    await copiaEmDia();
    const [r] = await sql`SELECT lat, lon FROM obras_coordenadas WHERE codigo = ${chaveObra(codigo)}`;
    return r ? { lat: Number(r.lat), lon: Number(r.lon) } : null;
  } catch (err) {
    console.error("Falha ao consultar coordenada da obra:", err);
    return null;
  }
}

// Lista inteira (para o celular guardar e usar sem internet): { "478604": [-7.92795, -38.95975], ... }
export async function todasCoordenadas(): Promise<{ em: string | null; obras: Record<string, [number, number]> }> {
  await copiaEmDia();
  const linhas = await sql`SELECT codigo, lat, lon, atualizado_em FROM obras_coordenadas`;
  const obras: Record<string, [number, number]> = {};
  for (const l of linhas) obras[l.codigo] = [Math.round(Number(l.lat) * 1e6) / 1e6, Math.round(Number(l.lon) * 1e6) / 1e6];
  return { em: linhas[0]?.atualizado_em ? new Date(linhas[0].atualizado_em).toISOString() : null, obras };
}

// CSV simples com aspas (padrão do export do Google)
function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = "";
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

export const MOTIVO_GPS: Record<string, string> = {
  permissao_negada: "localização bloqueada para o Ecoblaster no celular",
  gps_desligado: "GPS do celular desligado",
  sem_sinal: "sem sinal de GPS",
  sem_suporte: "navegador sem localização",
};
