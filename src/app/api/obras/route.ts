import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { obrasAdicionadas } from "@/lib/db/schema";
import { OBRAS } from "@/lib/config/obras";
import { isAdmin } from "@/lib/config/operadores";
import { novaObraSchema } from "@/lib/validation";

export async function GET() {
  const linhas = await db.select().from(obrasAdicionadas);
  return NextResponse.json(linhas.map((l) => l.codigo));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = novaObraSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Código de obra inválido" }, { status: 400 });
  }
  const { codigo, cpf } = parsed.data;
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  if (OBRAS.includes(codigo)) {
    return NextResponse.json({ erro: "Essa obra já existe na lista." }, { status: 409 });
  }

  await db
    .insert(obrasAdicionadas)
    .values({ codigo, criadoPor: cpf })
    .onConflictDoNothing();

  return NextResponse.json({ sucesso: true });
}
