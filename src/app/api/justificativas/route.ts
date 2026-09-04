import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { justificativas } from "@/lib/db/schema";
import { buscarOperador, isAdmin } from "@/lib/config/operadores";
import { MOTIVOS_JUSTIFICATIVA } from "@/lib/config/motivosJustificativa";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const condicoes = [];
  if (dataInicio) condicoes.push(gte(justificativas.data, dataInicio));
  if (dataFim) condicoes.push(lte(justificativas.data, dataFim));

  const resultado =
    condicoes.length > 0
      ? await db.select().from(justificativas).where(and(...condicoes))
      : await db.select().from(justificativas);

  return NextResponse.json(resultado);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cpfAdmin = body?.cpf;
  if (!isAdmin(cpfAdmin)) {
    return NextResponse.json({ sucesso: false, erro: "Não autorizado" }, { status: 403 });
  }

  const operadorCpf = body?.operadorCpf;
  const data = body?.data;
  const motivo = String(body?.motivo ?? "").trim();

  const operador = buscarOperador(operadorCpf);
  if (!operador || !data) {
    return NextResponse.json({ sucesso: false, erro: "Dados inválidos" }, { status: 400 });
  }

  try {
    if (!motivo) {
      // Sem motivo escolhido = remover justificativa existente, se houver.
      await db.delete(justificativas).where(and(eq(justificativas.cpf, operadorCpf), eq(justificativas.data, data)));
      return NextResponse.json({ sucesso: true });
    }

    if (!MOTIVOS_JUSTIFICATIVA.includes(motivo)) {
      return NextResponse.json({ sucesso: false, erro: "Motivo inválido" }, { status: 400 });
    }

    await db
      .insert(justificativas)
      .values({
        cpf: operadorCpf,
        operador: operador.nome,
        data,
        motivo,
        criadoPor: cpfAdmin,
      })
      .onConflictDoUpdate({
        target: [justificativas.cpf, justificativas.data],
        set: { motivo, criadoPor: cpfAdmin, criadoEm: new Date() },
      });

    return NextResponse.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao salvar justificativa:", err);
    return NextResponse.json({ sucesso: false, erro: "Erro ao salvar no banco de dados" }, { status: 500 });
  }
}
