import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros, turnosAbertos } from "@/lib/db/schema";
import { buscarOperador } from "@/lib/config/operadores";
import { registroSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ sucesso: false, erro: "Dados inválidos: " + parsed.error.issues[0]?.message }, { status: 400 });
  }

  const operador = buscarOperador(parsed.data.cpf);
  if (!operador) {
    return NextResponse.json({ sucesso: false, erro: "CPF não autorizado" }, { status: 403 });
  }

  try {
    await db.insert(registros).values({
      data: parsed.data.data,
      obra: parsed.data.obra,
      tipoCava: parsed.data.tipoCava,
      totalCavas: parsed.data.totalCavas,
      operador: operador.nome,
      cpf: operador.cpf,
      observacao: parsed.data.observacao,
      fotos: parsed.data.fotos,
    });

    if (parsed.data.turnoServerId) {
      await db
        .update(turnosAbertos)
        .set({ ativo: false, encerradoEm: new Date(), encerradoPor: operador.cpf, atualizadoEm: new Date() })
        .where(eq(turnosAbertos.id, parsed.data.turnoServerId));
    }

    return NextResponse.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao salvar registro:", err);
    return NextResponse.json({ sucesso: false, erro: "Erro ao salvar no banco de dados" }, { status: 500 });
  }
}
