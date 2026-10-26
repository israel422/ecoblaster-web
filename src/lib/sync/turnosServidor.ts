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

export async function encerrarTurnoNoServidor(id: string, encerradoPor: string): Promise<void> {
  try {
    await fetch(`/api/turnos-abertos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encerradoPor }),
    });
  } catch {
    // melhor esforço — sem internet, tudo bem, o servidor nunca soube que existia
  }
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
