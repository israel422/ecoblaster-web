import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cavasTrado, equipesTrado } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const condicoes = [];
  if (dataInicio) condicoes.push(gte(cavasTrado.data, dataInicio));
  if (dataFim) condicoes.push(lte(cavasTrado.data, dataFim));

  const resultado =
    condicoes.length > 0
      ? await db.select().from(cavasTrado).where(and(...condicoes))
      : await db.select().from(cavasTrado);

  return NextResponse.json(resultado);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cpfAdmin = body?.cpf;
  if (!isAdmin(cpfAdmin)) {
    return NextResponse.json({ sucesso: false, erro: "Não autorizado" }, { status: 403 });
  }

  const data = body?.data;
  const equipeId = Number(body?.equipeId);
  const quantidadeCavas = Number(body?.quantidadeCavas);
  // obrasAtribuidas = obras que a equipe tentou fazer com o trado no dia;
  // obrasTentativas = de quantas dessas ela conseguiu concluir a cava (nomes
  // de coluna antigos, significado real é esse — ver comentário no schema).
  const obrasAtribuidas = Number(body?.obrasAtribuidas ?? 0);
  const obrasTentativas = Number(body?.obrasTentativas ?? 0);
  const observacao = body?.observacao ? String(body.observacao).trim() : null;

  if (!data || !Number.isInteger(equipeId)) {
    return NextResponse.json({ sucesso: false, erro: "Dados inválidos" }, { status: 400 });
  }
  if (!Number.isInteger(quantidadeCavas) || quantidadeCavas < 0) {
    return NextResponse.json({ sucesso: false, erro: "Quantidade de cavas inválida" }, { status: 400 });
  }
  if (!Number.isInteger(obrasAtribuidas) || obrasAtribuidas < 0 || !Number.isInteger(obrasTentativas) || obrasTentativas < 0) {
    return NextResponse.json({ sucesso: false, erro: "Obras c/ trado usado/concluídas inválidas" }, { status: 400 });
  }
  if (obrasTentativas > obrasAtribuidas && obrasAtribuidas > 0) {
    return NextResponse.json(
      { sucesso: false, erro: "Obras concluídas não pode ser maior que obras c/ trado usado" },
      { status: 400 }
    );
  }

  const [equipe] = await db.select().from(equipesTrado).where(eq(equipesTrado.id, equipeId)).limit(1);
  if (!equipe) {
    return NextResponse.json({ sucesso: false, erro: "Equipe não encontrada" }, { status: 400 });
  }

  try {
    await db
      .insert(cavasTrado)
      .values({ data, equipeId, quantidadeCavas, obrasAtribuidas, obrasTentativas, observacao, criadoPor: cpfAdmin })
      .onConflictDoUpdate({
        target: [cavasTrado.equipeId, cavasTrado.data],
        set: { quantidadeCavas, obrasAtribuidas, obrasTentativas, observacao, criadoPor: cpfAdmin, criadoEm: new Date() },
      });

    return NextResponse.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao salvar cavas de trado:", err);
    return NextResponse.json({ sucesso: false, erro: "Erro ao salvar no banco de dados" }, { status: 500 });
  }
}
