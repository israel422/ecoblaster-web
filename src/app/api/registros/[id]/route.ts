import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { cloudinary, publicIdFromCloudinaryUrl } from "@/lib/cloudinary/cloudinaryClient";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";
import { TIPOS_CAVA } from "@/lib/config/tiposCava";
import { corrigirTipoCavaSchema } from "@/lib/validation";

// Correção de classificação errada (ex: operador marcou "Cava em Rocha" mas
// as fotos mostram outro tipo) — só o admin, feito depois de conferir as
// fotos no Painel. Não mexe em totalCavas nem fotos, só a etiqueta do tipo.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = corrigirTipoCavaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }
  if (!isAdmin(parsed.data.cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  if (!TIPOS_CAVA.some((t) => t.id === parsed.data.tipoCava)) {
    return NextResponse.json({ erro: "Tipo de cava inválido" }, { status: 400 });
  }

  const [registro] = await db.select().from(registros).where(eq(registros.id, idNum)).limit(1);
  if (!registro) {
    return NextResponse.json({ erro: "Registro não encontrado" }, { status: 404 });
  }

  await db.update(registros).set({ tipoCava: parsed.data.tipoCava }).where(eq(registros.id, idNum));

  return NextResponse.json({ sucesso: true });
}

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

  // Registros antigos têm fotos no Vercel Blob, registros novos no Cloudinary
  // (trocado em 2026-08-10) — apaga cada um pelo mecanismo certo, best-effort.
  const urls = (registro.fotos as { url?: string }[]).map((f) => f.url).filter((u): u is string => !!u);
  const urlsBlob = urls.filter((u) => u.includes(".blob.vercel-storage.com"));
  const urlsCloudinary = urls.filter((u) => u.includes("res.cloudinary.com"));

  if (urlsBlob.length > 0) {
    try {
      await del(urlsBlob);
    } catch (err) {
      console.error("Registro apagado, mas falhou ao apagar fotos do Blob:", err);
    }
  }
  if (urlsCloudinary.length > 0) {
    const publicIds = urlsCloudinary.map(publicIdFromCloudinaryUrl).filter((id): id is string => !!id);
    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (err) {
      console.error("Registro apagado, mas falhou ao apagar fotos do Cloudinary:", err);
    }
  }

  return NextResponse.json({ sucesso: true });
}
