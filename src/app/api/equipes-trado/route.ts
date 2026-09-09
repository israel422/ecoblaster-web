import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { equipesTrado } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

const TIPOS_VALIDOS = ["novo", "antigo"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const resultado = await db.select().from(equipesTrado);
  return NextResponse.json(resultado);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cpfAdmin = body?.cpf;
  if (!isAdmin(cpfAdmin)) {
    return NextResponse.json({ sucesso: false, erro: "Não autorizado" }, { status: 403 });
  }

  const cidade = String(body?.cidade ?? "").trim();
  const responsavel = body?.responsavel ? String(body.responsavel).trim() : null;
  const tipoEquipamento = String(body?.tipoEquipamento ?? "");

  if (!cidade || !TIPOS_VALIDOS.includes(tipoEquipamento)) {
    return NextResponse.json({ sucesso: false, erro: "Dados inválidos" }, { status: 400 });
  }

  const [nova] = await db
    .insert(equipesTrado)
    .values({ cidade, responsavel, tipoEquipamento })
    .returning();

  return NextResponse.json({ sucesso: true, equipe: nova });
}
