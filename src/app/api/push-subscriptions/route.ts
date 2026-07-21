import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";
import { pushSubscriptionSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Inscrição inválida" }, { status: 400 });
  }
  const { cpf, endpoint, keys } = parsed.data;
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  await db
    .insert(pushSubscriptions)
    .values({ endpoint, cpf, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { cpf, p256dh: keys.p256dh, auth: keys.auth },
    });

  return NextResponse.json({ sucesso: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "";
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return NextResponse.json({ sucesso: true });
}
