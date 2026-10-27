import { apagarTurno, listarTurnosPorCpf, listarTodosTurnos, type TurnoRegistro } from "@/lib/idb/turnosDb";
import { listarTurnosServidor, listarTodosTurnosServidor, reenviarEncerramentosPendentes, turnosDescartados, type TurnoAbertoServidor } from "@/lib/sync/turnosServidor";
import { isAdmin } from "@/lib/config/operadores";

export interface TurnoExibicao {
  chave: string;
  local?: TurnoRegistro;
  remoto?: TurnoAbertoServidor;
}

// Mescla os turnos guardados neste aparelho (IndexedDB) com o sinalizador do
// servidor — turnos que existem no servidor mas não neste aparelho aparecem
// como "remoto" (iniciados em outro aparelho, só dá pra descartar, não editar).
export async function obterTurnosParaExibir(cpf: string): Promise<TurnoExibicao[]> {
  const admin = isAdmin(cpf);
  // primeiro manda os encerramentos que ficaram sem sinal, senão o turno já fechado
  // neste celular volta como "outro aparelho"
  const aindaPendentes = await reenviarEncerramentosPendentes();
  const [todosLocais, todosRemotos] = await Promise.all([
    admin ? listarTodosTurnos() : listarTurnosPorCpf(cpf),
    admin ? listarTodosTurnosServidor(cpf) : listarTurnosServidor(cpf),
  ]);
  const remotos = todosRemotos.filter((r) => !aindaPendentes.has(r.id));
  // turno que o administrador descartou pelo painel: apaga a cópia deste celular e libera o operador
  const descartados = await turnosDescartados(todosLocais.map((l) => l.serverId).filter((x): x is string => !!x));
  for (const l of todosLocais) if (l.serverId && descartados.has(l.serverId) && l.id) await apagarTurno(l.id);
  const locais = todosLocais.filter((l) => !(l.serverId && descartados.has(l.serverId)));

  const resultado: TurnoExibicao[] = locais.map((l) => ({
    chave: `local-${l.id}`,
    local: l,
  }));

  remotos.forEach((r) => {
    const jaLocal = locais.some((l) => l.cpf === r.cpf && l.obra === r.obra && l.data === r.data);
    if (!jaLocal) {
      resultado.push({ chave: `remoto-${r.id}`, remoto: r });
    }
  });

  return resultado;
}
