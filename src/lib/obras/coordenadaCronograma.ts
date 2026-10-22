import { unstable_cache } from "next/cache";

// Coordenada de cada obra na planilha CRONOGRAMA DE OBRAS - CELPE (aba CONSTRUÇÃO, compartilhada
// por link): F = SAP, AJ = latitude, AK = longitude. É o plano B quando a foto fica sem GPS —
// em hipótese alguma uma foto de cava fica sem coordenada.
const PLANILHA = process.env.CRONOGRAMA_ID || "15dvHw_RSdy-fovCuECMSe9CI3UYSNmUeyO7u-9qs9W0";
const GID = process.env.CRONOGRAMA_GID || "1196101802";
const URL_CSV = `https://docs.google.com/spreadsheets/d/${PLANILHA}/export?format=csv&gid=${GID}`;

const COL_SAP = 5, COL_LAT = 35, COL_LON = 36;

export const chaveObra = (codigo: string) => codigo.replace(/\D/g, "").replace(/^0+/, "");

// O CSV tem ~4,5 MB (grande demais pro cache de fetch): baixa sem cache e guarda por 6 h só SAP → [lat, lon].
const carregarCoordenadas = unstable_cache(
  async (): Promise<Record<string, [number, number]>> => {
    const r = await fetch(URL_CSV, { cache: "no-store" });
    if (!r.ok) throw new Error(`Google respondeu ${r.status}`);
    const texto = await r.text();
    if (texto.trimStart().startsWith("<")) throw new Error("cronograma sem acesso por link");
    const mapa: Record<string, [number, number]> = {};
    for (const l of lerCsv(texto).slice(1)) {
      const sap = chaveObra(l[COL_SAP] ?? "");
      const lat = Number((l[COL_LAT] ?? "").trim().replace(",", "."));
      const lon = Number((l[COL_LON] ?? "").trim().replace(",", "."));
      // só Pernambuco (descarta "-", vazio e coordenada trocada)
      if (!sap || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -10 || lat > -6.5 || lon < -42 || lon > -34) continue;
      mapa[sap] ??= [lat, lon];
    }
    return mapa;
  },
  ["cronograma-coordenadas-v1"],
  { revalidate: 6 * 3600 }
);

export async function coordenadaDaObra(codigo: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const c = (await carregarCoordenadas())[chaveObra(codigo)];
    return c ? { lat: c[0], lon: c[1] } : null;
  } catch (err) {
    console.error("Falha ao ler o cronograma:", err);
    return null;
  }
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
