import { neon } from "@neondatabase/serverless";
import { OPERADORES, isAdmin } from "@/lib/config/operadores";
import { hojeBR } from "@/lib/turnos/relatorioTurnos";
import { enviarPushParaTodos } from "@/lib/push/enviarPush";

// Central de Problemas: o que o app (celular dos operadores) avisa + o que o servidor detecta sozinho.
const sql = neon(process.env.DATABASE_URL!);

export const TIPOS = ["turno_pendente", "gps_bloqueado", "erro_sincronizar", "erro_app", "cpf_invalido"] as const;
export type TipoProblema = (typeof TIPOS)[number];

let pronta: Promise<unknown> | null = null;
function garantirTabela() {
  pronta ??= sql`CREATE TABLE IF NOT EXISTS problemas (
    id serial PRIMARY KEY,
    tipo text NOT NULL,
    cpf text NOT NULL,
    operador text NOT NULL,
    chave text NOT NULL DEFAULT '',
    detalhe jsonb NOT NULL DEFAULT '{}'::jsonb,
    vezes integer NOT NULL DEFAULT 1,
    primeiro_em timestamptz NOT NULL DEFAULT now(),
    ultimo_em timestamptz NOT NULL DEFAULT now(),
    resolvido_em timestamptz,
    resolvido_por text
  )`.catch((e) => {
    pronta = null;
    throw e;
  });
  return pronta;
}

const nomeDe = (cpf: string) => OPERADORES.find((o) => o.cpf === cpf)?.nome ?? "CPF não cadastrado";

// Registra (ou soma mais uma vez no mesmo problema ainda aberto). Problema novo avisa os administradores.
export async function registrarProblema(tipo: TipoProblema, cpf: string, chave: string, detalhe: Record<string, unknown>) {
  await garantirTabela();
  const operador = nomeDe(cpf);
  const [aberto] = (await sql`SELECT id FROM problemas WHERE tipo = ${tipo} AND cpf = ${cpf} AND chave = ${chave}
    AND resolvido_em IS NULL AND ultimo_em > now() - interval '3 days' LIMIT 1`) as { id: number }[];
  if (aberto) {
    await sql`UPDATE problemas SET vezes = vezes + 1, ultimo_em = now(), detalhe = ${JSON.stringify(detalhe)}::jsonb WHERE id = ${aberto.id}`;
    return;
  }
  await sql`INSERT INTO problemas (tipo, cpf, operador, chave, detalhe) VALUES (${tipo}, ${cpf}, ${operador}, ${chave}, ${JSON.stringify(detalhe)}::jsonb)`;
  await enviarPushParaTodos({
    titulo: "⚠️ Central de Problemas",
    corpo: `${operador}: ${TITULO[tipo](detalhe)}`,
    url: "/?tela=problemas",
  }).catch(() => {});
}

const lista = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
const TITULO: Record<TipoProblema, (d: Record<string, unknown>) => string> = {
  turno_pendente: (d) => `turno pendente impediu abrir turno novo (obra ${lista(d.obras)})`,
  gps_bloqueado: () => "localização do celular bloqueada para o Ecoblaster",
  erro_sincronizar: (d) => `falha ao enviar as fotos da obra ${d.obra ?? "?"}`,
  erro_app: (d) => `erro inesperado no app (${String(d.mensagem ?? "").slice(0, 60)})`,
  cpf_invalido: (d) => `tentou entrar com CPF não cadastrado (${d.cpfMascarado ?? "?"})`,
};

export type Acao = { tipo: "descartar_turno"; turnoId: string; rotulo: string } | { tipo: "resolver"; id: number } | { tipo: "abrir"; tela: string; rotulo: string };
export type Problema = {
  id: string; gravidade: "alta" | "media" | "baixa"; titulo: string; quem: string; quando: string;
  vezes: number; detalhe: string; solucao: string; acoes: Acao[]; origem: "app" | "servidor";
};

const hora = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

// Tudo que está aberto agora, com a solução de cada um
export async function listarProblemas(): Promise<Problema[]> {
  await garantirTabela();
  const hoje = hojeBR();
  const [guardados, turnosVelhos, acessosHoje, ativosHoje, registrosHoje] = (await Promise.all([
    sql`SELECT id, tipo, cpf, operador, chave, detalhe, vezes, primeiro_em, ultimo_em FROM problemas
        WHERE resolvido_em IS NULL AND ultimo_em > now() - interval '3 days' ORDER BY ultimo_em DESC`,
    sql`SELECT id, cpf, operador, obra, to_char(data,'YYYY-MM-DD') AS data, criado_em FROM turnos_abertos WHERE ativo AND data < ${hoje} ORDER BY data`,
    sql`SELECT cpf, max(operador) AS operador, count(*)::int AS n, min(criado_em) AS primeiro, max(criado_em) AS ultimo FROM acessos
        WHERE (criado_em AT TIME ZONE 'America/Recife')::date = ${hoje}::date GROUP BY cpf`,
    sql`SELECT DISTINCT cpf FROM turnos_abertos WHERE (criado_em AT TIME ZONE 'America/Recife')::date = ${hoje}::date`,
    sql`SELECT DISTINCT cpf FROM registros WHERE (criado_em AT TIME ZONE 'America/Recife')::date = ${hoje}::date`,
  ])) as [Record<string, unknown>[], Record<string, unknown>[], Record<string, unknown>[], { cpf: string }[], { cpf: string }[]];

  const out: Problema[] = [];
  const turnoAtivoPorId = new Map(turnosVelhos.map((t) => [String(t.id), t]));

  // ---- avisos que vieram do app
  for (const g of guardados) {
    const d = (g.detalhe ?? {}) as Record<string, unknown>;
    const tipo = g.tipo as TipoProblema;
    const base = { id: `p${g.id}`, quem: String(g.operador), quando: hora(new Date(String(g.ultimo_em))), vezes: Number(g.vezes), origem: "app" as const };
    const resolver: Acao = { tipo: "resolver", id: Number(g.id) };
    if (tipo === "turno_pendente") {
      const ids = (Array.isArray(d.turnos) ? d.turnos : []) as { serverId?: string; obra?: string; data?: string }[];
      const descartar = ids.filter((t) => t.serverId && turnoAtivoPorId.has(t.serverId))
        .map((t) => ({ tipo: "descartar_turno" as const, turnoId: t.serverId!, rotulo: `Descartar turno da obra ${t.obra}` }));
      out.push({ ...base, gravidade: "alta", titulo: "Não consegue abrir turno novo: tem turno pendente no celular",
        detalhe: `Pendente(s): ${ids.map((t) => `obra ${t.obra}${t.data ? ` (${dataBR(t.data)})` : ""}`).join(", ") || lista(d.obras)}`,
        solucao: "Se ele trabalhou nessa obra: pedir para abrir \"Turnos em Aberto\", tocar em \"Concluir Fotos\" e depois \"Sincronizar\". " +
          "Se a obra foi aberta por engano: descartar o turno aqui — o celular dele apaga a cópia sozinho na próxima vez que abrir o app e fica liberado.",
        acoes: [...descartar, resolver] });
    } else if (tipo === "gps_bloqueado") {
      out.push({ ...base, gravidade: "media", titulo: "Localização do celular bloqueada para o Ecoblaster",
        detalhe: "O app pediu para liberar e continuou bloqueado. As fotos saem sem o GPS real (usa a coordenada do cronograma).",
        solucao: "Ligar para o operador e guiar: no Chrome, tocar no cadeado ao lado do endereço → Permissões → Localização → Permitir. " +
          "Se não aparecer: Configurações do celular → Apps → Chrome → Permissões → Localização → Permitir durante o uso. E deixar o GPS ligado.",
        acoes: [resolver] });
    } else if (tipo === "erro_sincronizar") {
      out.push({ ...base, gravidade: "alta", titulo: `Fotos não estão sendo enviadas (obra ${d.obra ?? "?"})`,
        detalhe: `Erro: ${String(d.erro ?? "sem detalhe")}`,
        solucao: "Quase sempre é internet fraca: pedir para ir a um lugar com sinal (ou Wi-Fi), abrir \"Turnos em Aberto\" e tocar em \"Sincronizar\" de novo. " +
          "As fotos ficam guardadas no celular até enviar — não apagar o app. Se o erro continuar com internet boa, me mande o texto do erro.",
        acoes: [resolver] });
    } else if (tipo === "erro_app") {
      out.push({ ...base, gravidade: "media", titulo: "Erro inesperado no app",
        detalhe: `${String(d.mensagem ?? "")}${d.tela ? ` · tela: ${d.tela}` : ""}`,
        solucao: "Pedir para fechar e abrir o Ecoblaster de novo. Se repetir, me mande este erro que eu corrijo no código.",
        acoes: [resolver] });
    } else if (tipo === "cpf_invalido") {
      out.push({ ...base, quem: "CPF não cadastrado", gravidade: "baixa", titulo: `Tentativa de entrar com CPF não cadastrado (${d.cpfMascarado ?? "?"})`,
        detalhe: "O CPF digitado não está na lista de operadores do app.",
        solucao: "Se for um operador novo, me passe o nome, o CPF e a função (retro, blaster, compressor) que eu cadastro. Se foi erro de digitação, pedir para conferir o CPF.",
        acoes: [resolver] });
    }
  }

  // ---- detectado pelo servidor: turno de dia anterior ainda aberto
  for (const t of turnosVelhos) {
    if (isAdmin(String(t.cpf))) continue;
    out.push({
      id: `t${t.id}`, origem: "servidor", gravidade: "alta", quem: String(t.operador), quando: hora(new Date(String(t.criado_em))), vezes: 1,
      titulo: `Turno de ${dataBR(String(t.data))} ainda aberto (obra ${t.obra})`,
      detalhe: "Enquanto esse turno estiver aberto, ele não consegue iniciar o turno de hoje.",
      solucao: "Se ele trabalhou nessa obra: pedir para concluir as fotos e sincronizar. Se não: descartar aqui — libera o celular dele na próxima abertura do app.",
      acoes: [{ tipo: "descartar_turno", turnoId: String(t.id), rotulo: "Descartar este turno" }],
    });
  }

  // ---- detectado pelo servidor: entrou várias vezes hoje e não conseguiu lançar nada
  const comTurno = new Set(ativosHoje.map((x) => x.cpf)), comRegistro = new Set(registrosHoje.map((x) => x.cpf));
  for (const a of acessosHoje) {
    const cpf = String(a.cpf);
    if (isAdmin(cpf) || Number(a.n) < 3 || comTurno.has(cpf) || comRegistro.has(cpf)) continue;
    const jaExplicado = out.some((p) => p.quem === a.operador && p.gravidade === "alta");
    out.push({
      id: `a${cpf}`, origem: "servidor", gravidade: jaExplicado ? "baixa" : "media", quem: String(a.operador), quando: hora(new Date(String(a.ultimo))), vezes: Number(a.n),
      titulo: `Entrou ${a.n} vezes hoje e não conseguiu abrir turno`,
      detalhe: `Primeira entrada ${hora(new Date(String(a.primeiro)))}, última ${hora(new Date(String(a.ultimo)))}. Nenhum turno aberto nem foto enviada hoje.`,
      solucao: jaExplicado
        ? "A causa provável está no problema acima, do mesmo operador."
        : "Pedir um print da tela que aparece depois do CPF. Causas comuns: turno pendente no celular, localização bloqueada ou falta de obra no cronograma.",
      acoes: [],
    });
  }
  const peso = { alta: 0, media: 1, baixa: 2 };
  return out.sort((x, y) => peso[x.gravidade] - peso[y.gravidade]);
}

export async function resolverProblema(id: number, por: string) {
  await garantirTabela();
  await sql`UPDATE problemas SET resolvido_em = now(), resolvido_por = ${por} WHERE id = ${id}`;
}
