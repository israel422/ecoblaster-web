import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { turnosAbertos } from "@/lib/db/schema";
import { buscarOperador, isAdmin } from "@/lib/config/operadores";
import { turnoAbertoSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = turnoAbertoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });

  const operador = buscarOperador(parsed.data.cpf);
  if (!operador) return NextResponse.json({ erro: "CPF não autorizado" }, { status: 403 });

  const existente = await db
    .select({ id: turnosAbertos.id })
    .from(turnosAbertos)
    .where(
      and(
        eq(turnosAbertos.cpf, parsed.data.cpf),
        eq(turnosAbertos.obra, parsed.data.obra),
        eq(turnosAbertos.data, parsed.data.data),
        eq(turnosAbertos.ativo, true)
      )
    )
    .limit(1);

  if (existente.length > 0) {
    return NextResponse.json({ id: existente[0].id });
  }

  const [novo] = await db
    .insert(turnosAbertos)
    .values({
      cpf: parsed.data.cpf,
      operador: operador.nome,
      obra: parsed.data.obra,
      data: parsed.data.data,
    })
    .returning({ id: turnosAbertos.id });

  return NextResponse.json({ id: novo.id });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf");
  const scope = searchParams.get("scope");
  if (!cpf) return NextResponse.json({ erro: "cpf obrigatório" }, { status: 400 });

  if (scope === "all") {
    if (!isAdmin(cpf)) return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
    const todos = await db.select().from(turnosAbertos).where(eq(turnosAbertos.ativo, true));
    return NextResponse.json(todos);
  }

  const meus = await db
    .select()
    .from(turnosAbertos)
    .where(and(eq(turnosAbertos.cpf, cpf), eq(turnosAbertos.ativo, true)));
  return NextResponse.json(meus);
}
