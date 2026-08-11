import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { obrasAdicionadas } from "@/lib/db/schema";
import { OBRAS } from "@/lib/config/obras";
import { isAdmin } from "@/lib/config/operadores";
import { novasObrasLoteSchema } from "@/lib/validation";

// Adiciona várias obras de uma vez (ex: colar a lista inteira do mês) em vez
// de uma por uma. Ignora silenciosamente as que já existem, não é erro.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = novasObrasLoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Lista de obras inválida" }, { status: 400 });
  }
  const { codigos, cpf } = parsed.data;
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const unicos = Array.from(new Set(codigos));
  const novos = unicos.filter((c) => !OBRAS.includes(c));

  if (novos.length > 0) {
    await db
      .insert(obrasAdicionadas)
      .values(novos.map((codigo) => ({ codigo, criadoPor: cpf })))
      .onConflictDoNothing();
  }

  return NextResponse.json({
    sucesso: true,
    adicionadas: novos.length,
    ignoradas: unicos.length - novos.length,
  });
}
