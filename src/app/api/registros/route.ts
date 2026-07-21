import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
import { buscarOperador, isAdmin } from "@/lib/config/operadores";
import { registroSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const obra = searchParams.get("obra");
  const operador = searchParams.get("operador");
  const tipoCava = searchParams.get("tipoCava");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const condicoes = [];
  if (obra) condicoes.push(ilike(registros.obra, `%${obra}%`));
  if (operador) condicoes.push(ilike(registros.operador, `%${operador}%`));
  if (tipoCava) condicoes.push(eq(registros.tipoCava, tipoCava));
  if (dataInicio) condicoes.push(gte(registros.data, dataInicio));
  if (dataFim) condicoes.push(lte(registros.data, dataFim));

  const resultado =
    condicoes.length > 0
      ? await db.select().from(registros).where(and(...condicoes)).orderBy(desc(registros.criadoEm)).limit(300)
      : await db.select().from(registros).orderBy(desc(registros.criadoEm)).limit(300);

  return NextResponse.json(resultado);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ sucesso: false, erro: "Dados inválidos: " + parsed.error.issues[0]?.message }, { status: 400 });
  }

  const operador = buscarOperador(parsed.data.cpf);
  if (!operador) {
    return NextResponse.json({ sucesso: false, erro: "CPF não autorizado" }, { status: 403 });
  }

  try {
    await db.insert(registros).values({
      data: parsed.data.data,
      obra: parsed.data.obra,
      tipoCava: parsed.data.tipoCava,
      totalCavas: parsed.data.totalCavas,
      operador: operador.nome,
      cpf: operador.cpf,
      observacao: parsed.data.observacao,
      fotos: parsed.data.fotos,
      turnoId: parsed.data.turnoServerId,
    });

    return NextResponse.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao salvar registro:", err);
    return NextResponse.json({ sucesso: false, erro: "Erro ao salvar no banco de dados" }, { status: 500 });
  }
}
