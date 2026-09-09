import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { equipesTrado } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

const TIPOS_VALIDOS = ["novo", "antigo"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const cpfAdmin = body?.cpf;
  if (!isAdmin(cpfAdmin)) {
    return NextResponse.json({ sucesso: false, erro: "Não autorizado" }, { status: 403 });
  }

  const cidade = String(body?.cidade ?? "").trim();
  const responsavel = body?.responsavel ? String(body.responsavel).trim() : null;
  const tipoEquipamento = String(body?.tipoEquipamento ?? "");
  const ativo = Boolean(body?.ativo);

  if (!cidade || !TIPOS_VALIDOS.includes(tipoEquipamento)) {
    return NextResponse.json({ sucesso: false, erro: "Dados inválidos" }, { status: 400 });
  }

  await db
    .update(equipesTrado)
    .set({ cidade, responsavel, tipoEquipamento, ativo })
    .where(eq(equipesTrado.id, idNum));

  return NextResponse.json({ sucesso: true });
}
