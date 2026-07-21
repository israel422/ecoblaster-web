import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { turnosAbertos } from "@/lib/db/schema";
import { OPERADORES } from "@/lib/config/operadores";

export interface OperadorRelatorio {
  cpf: string;
  nome: string;
}

export interface RelatorioTurnos {
  data: string;
  abriram: OperadorRelatorio[];
  naoAbriram: OperadorRelatorio[];
}

export function hojeBR(): string {
  // America/Sao_Paulo não tem horário de verão desde 2019 — sempre UTC-3.
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  const dia = partes.find((p) => p.type === "day")!.value;
  return `${ano}-${mes}-${dia}`;
}

export async function obterRelatorioTurnos(data: string): Promise<RelatorioTurnos> {
  const operadoresCampo = OPERADORES.filter((o) => !o.admin);
  const abertosNoDia = await db.select().from(turnosAbertos).where(eq(turnosAbertos.data, data));
  const cpfsComTurno = new Set(abertosNoDia.map((t) => t.cpf));

  return {
    data,
    abriram: operadoresCampo.filter((o) => cpfsComTurno.has(o.cpf)).map((o) => ({ cpf: o.cpf, nome: o.nome })),
    naoAbriram: operadoresCampo.filter((o) => !cpfsComTurno.has(o.cpf)).map((o) => ({ cpf: o.cpf, nome: o.nome })),
  };
}
