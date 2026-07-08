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
