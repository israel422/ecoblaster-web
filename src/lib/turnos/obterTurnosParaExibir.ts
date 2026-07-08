import { listarTurnosPorCpf, listarTodosTurnos, type TurnoRegistro } from "@/lib/idb/turnosDb";
import { listarTurnosServidor, listarTodosTurnosServidor, type TurnoAbertoServidor } from "@/lib/sync/turnosServidor";
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
  const [locais, remotos] = await Promise.all([
    admin ? listarTodosTurnos() : listarTurnosPorCpf(cpf),
    admin ? listarTodosTurnosServidor(cpf) : listarTurnosServidor(cpf),
  ]);

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
