export interface TurnoAbertoServidor {
  id: string;
  cpf: string;
  operador: string;
  obra: string;
  data: string;
}

export async function registrarTurnoAbertoNoServidor(cpf: string, obra: string, data: string): Promise<string | null> {
  try {
    const resp = await fetch("/api/turnos-abertos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf, obra, data }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.id ?? null;
  } catch {
    return null;
  }
}

// Encerramentos que não chegaram no servidor (sem sinal na hora de fechar). O celular
// já apagou a cópia local do turno, então sem isso o turno ficava aberto no servidor e
// voltava como "iniciado em outro aparelho", travando o operador (caso Gabriel Andrade, 26/10).
const CHAVE_ENCERRAMENTOS = "ecoblaster_encerramentos_pendentes";

type EncerramentoPendente = { id: string; encerradoPor: string };

function lerEncerramentosPendentes(): EncerramentoPendente[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ENCERRAMENTOS) || "[]");
  } catch {
    return [];
  }
}

function gravarEncerramentosPendentes(lista: EncerramentoPendente[]) {
  try {
    localStorage.setItem(CHAVE_ENCERRAMENTOS, JSON.stringify(lista));
  } catch {
    // sem armazenamento: paciência, o admin ainda pode descartar pela Central
  }
}

async function tentarEncerrar(id: string, encerradoPor: string): Promise<boolean> {
  try {
    const resp = await fetch(`/api/turnos-abertos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encerradoPor }),
    });
    // 404 = o turno nem existe mais no servidor, não adianta insistir
    return resp.ok || resp.status === 404;
  } catch {
    return false;
  }
}

export async function encerrarTurnoNoServidor(id: string, encerradoPor: string): Promise<void> {
  if (await tentarEncerrar(id, encerradoPor)) return;
  const pendentes = lerEncerramentosPendentes().filter((p) => p.id !== id);
  gravarEncerramentosPendentes([...pendentes, { id, encerradoPor }]);
}

// Reenvia os encerramentos que ficaram pendentes; devolve os ids que continuam
// pendentes (esses turnos já foram fechados neste celular e não devem travar ninguém).
export async function reenviarEncerramentosPendentes(): Promise<Set<string>> {
  const pendentes = lerEncerramentosPendentes();
  if (!pendentes.length) return new Set();
  const restantes: EncerramentoPendente[] = [];
  for (const p of pendentes) {
    if (!(await tentarEncerrar(p.id, p.encerradoPor))) restantes.push(p);
  }
  gravarEncerramentosPendentes(restantes);
  return new Set(restantes.map((p) => p.id));
}

export async function listarTurnosServidor(cpf: string): Promise<TurnoAbertoServidor[]> {
  try {
    const resp = await fetch(`/api/turnos-abertos?cpf=${encodeURIComponent(cpf)}`);
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

export async function listarTodosTurnosServidor(cpfAdmin: string): Promise<TurnoAbertoServidor[]> {
  try {
    const resp = await fetch(`/api/turnos-abertos?scope=all&cpf=${encodeURIComponent(cpfAdmin)}`);
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

// Turnos guardados no celular que o administrador descartou pelo painel (só responde se o servidor respondeu:
// sem internet não apaga nada)
export async function turnosDescartados(serverIds: string[]): Promise<Set<string>> {
  if (!serverIds.length) return new Set();
  try {
    const resp = await fetch(`/api/turnos-abertos/status?ids=${serverIds.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
    if (!resp.ok) return new Set();
    const lista = (await resp.json()) as { id: string; descartado: boolean }[];
    return new Set(lista.filter((t) => t.descartado).map((t) => t.id));
  } catch {
    return new Set();
  }
}
