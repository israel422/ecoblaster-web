import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/config/operadores";
import { resolverProblema } from "@/lib/problemas/servidor";

// Marcar um problema avisado pelo app como resolvido
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = (await req.json().catch(() => null)) as { cpf?: string } | null;
  if (!isAdmin(b?.cpf || "")) return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  if (!/^\d+$/.test(id)) return NextResponse.json({ erro: "inválido" }, { status: 400 });
  await resolverProblema(Number(id), b!.cpf!);
  return NextResponse.json({ ok: true });
}
