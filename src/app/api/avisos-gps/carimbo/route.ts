import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

type Foto = { url?: string; gpsCorrigido?: string; gpsOriginal?: Record<string, unknown>; carimboCorrigido?: boolean };

// Depois de "Usar coordenada do cronograma": o navegador do admin reescreveu a linha do GPS no carimbo,
// subiu a imagem nova (/api/fotos) e aqui a foto passa a apontar para ela. A imagem original fica em gpsOriginal.url.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { cpf?: string; id?: number; idx?: number; url?: string } | null;
  if (!isAdmin(body?.cpf || "")) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id, idx, url } = body ?? {};
  if (!Number.isInteger(id) || !Number.isInteger(idx) || typeof url !== "string" || !url.startsWith("https://res.cloudinary.com/")) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }
  const [linha] = await db.select({ fotos: registros.fotos }).from(registros).where(eq(registros.id, id!));
  const fotos = (linha?.fotos as Foto[] | undefined) ?? [];
  const f = fotos[idx!];
  // só foto já corrigida pelo botão (coordenada trocada) pode ter o carimbo trocado
  if (!f?.gpsCorrigido || !f.gpsOriginal) {
    return NextResponse.json({ erro: "Foto não corrigida" }, { status: 400 });
  }
  if (!f.carimboCorrigido) f.gpsOriginal = { ...f.gpsOriginal, url: f.url };
  f.url = url;
  f.carimboCorrigido = true;
  await db.update(registros).set({ fotos }).where(eq(registros.id, id!));
  return NextResponse.json({ ok: true });
}
