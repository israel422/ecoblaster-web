import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
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

  const [registro] = await db.select().from(registros).where(eq(registros.id, idNum)).limit(1);
  if (!registro) {
    return NextResponse.json({ erro: "Registro não encontrado" }, { status: 404 });
  }

  await db.delete(registros).where(eq(registros.id, idNum));

  const urls = (registro.fotos as { url?: string }[]).map((f) => f.url).filter((u): u is string => !!u);
  if (urls.length > 0) {
    try {
      await del(urls);
    } catch (err) {
      console.error("Registro apagado, mas falhou ao apagar fotos do Blob:", err);
    }
  }

  return NextResponse.json({ sucesso: true });
}
