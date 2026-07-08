import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { turnosAbertos } from "@/lib/db/schema";
import { buscarOperador, isAdmin } from "@/lib/config/operadores";
import { encerrarTurnoSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = encerrarTurnoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const [turno] = await db.select().from(turnosAbertos).where(eq(turnosAbertos.id, id)).limit(1);
  if (!turno) return NextResponse.json({ erro: "Turno não encontrado" }, { status: 404 });

  const solicitante = buscarOperador(parsed.data.encerradoPor);
  if (!solicitante) return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });

  // só o dono do turno (encerramento normal ao sincronizar) ou o admin (descarte) pode encerrar
  if (solicitante.cpf !== turno.cpf && !isAdmin(solicitante.cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  await db
    .update(turnosAbertos)
    .set({
      ativo: false,
      encerradoEm: new Date(),
      encerradoPor: parsed.data.encerradoPor,
      atualizadoEm: new Date(),
    })
    .where(eq(turnosAbertos.id, id));

  return NextResponse.json({ ok: true });
}
