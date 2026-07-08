import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { acessos } from "@/lib/db/schema";
import { buscarOperador } from "@/lib/config/operadores";
import { acessoSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = acessoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "CPF inválido" }, { status: 400 });
  }
  const operador = buscarOperador(parsed.data.cpf);
  if (!operador) {
    return NextResponse.json({ erro: "CPF não autorizado" }, { status: 403 });
  }
  await db.insert(acessos).values({ cpf: operador.cpf, operador: operador.nome });
  return NextResponse.json({ operador: operador.nome, categoria: operador.categoria, admin: operador.admin });
}
