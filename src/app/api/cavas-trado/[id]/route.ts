import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cavasTrado } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  await db.delete(cavasTrado).where(eq(cavasTrado.id, idNum));

  return NextResponse.json({ sucesso: true });
}
