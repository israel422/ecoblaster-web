import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros, turnosAbertos } from "@/lib/db/schema";
import { buscarOperador, isAdmin } from "@/lib/config/operadores";
import { observacaoTurnoSchema } from "@/lib/validation";

// Aplica a mesma observação em todos os registros (1 por cava) já criados
// durante um turno, chamado uma vez no fim (depois de "Encerrar Turno").
export async function PATCH(req: Request, { params }: { params: Promise<{ turnoId: string }> }) {
  const { turnoId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = observacaoTurnoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const operador = buscarOperador(parsed.data.cpf);
  if (!operador) return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });

  const [turno] = await db.select().from(turnosAbertos).where(eq(turnosAbertos.id, turnoId)).limit(1);
  if (turno && turno.cpf !== parsed.data.cpf && !isAdmin(parsed.data.cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  await db.update(registros).set({ observacao: parsed.data.observacao }).where(eq(registros.turnoId, turnoId));

  return NextResponse.json({ sucesso: true });
}
