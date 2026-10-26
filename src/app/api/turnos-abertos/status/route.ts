import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { turnosAbertos } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O celular do operador pergunta pelos turnos que tem guardados: algum foi descartado pelo administrador?
// (aí o celular apaga a cópia dele e o operador fica livre para abrir turno novo)
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter((i) => UUID.test(i)).slice(0, 50);
  if (!ids.length) return NextResponse.json([]);
  const linhas = await db
    .select({ id: turnosAbertos.id, ativo: turnosAbertos.ativo, cpf: turnosAbertos.cpf, encerradoPor: turnosAbertos.encerradoPor })
    .from(turnosAbertos)
    .where(inArray(turnosAbertos.id, ids));
  return NextResponse.json(
    linhas.map((l) => ({
      id: l.id,
      ativo: l.ativo,
      // encerrado por um administrador que não é o dono do turno = descartado pelo painel
      descartado: !l.ativo && !!l.encerradoPor && l.encerradoPor !== l.cpf && isAdmin(l.encerradoPor),
    }))
  );
}
