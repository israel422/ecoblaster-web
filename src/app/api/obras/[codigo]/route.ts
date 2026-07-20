import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { obrasAdicionadas } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

export async function DELETE(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  await db.delete(obrasAdicionadas).where(eq(obrasAdicionadas.codigo, codigo));
  return NextResponse.json({ sucesso: true });
}
