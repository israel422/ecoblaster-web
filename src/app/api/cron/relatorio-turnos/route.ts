import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { turnosAbertos } from "@/lib/db/schema";
import { OPERADORES } from "@/lib/config/operadores";
import { enviarPushParaTodos } from "@/lib/push/enviarPush";

function hojeBR(): string {
  // America/Sao_Paulo não tem horário de verão desde 2019 — sempre UTC-3.
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  const dia = partes.find((p) => p.type === "day")!.value;
  return `${ano}-${mes}-${dia}`;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const hoje = hojeBR();
  const operadoresCampo = OPERADORES.filter((o) => !o.admin);

  const abertosHoje = await db.select().from(turnosAbertos).where(eq(turnosAbertos.data, hoje));
  const cpfsComTurno = new Set(abertosHoje.map((t) => t.cpf));

  const abriram = operadoresCampo.filter((o) => cpfsComTurno.has(o.cpf));
  const naoAbriram = operadoresCampo.filter((o) => !cpfsComTurno.has(o.cpf));

  const corpo = [
    `✅ Abriram (${abriram.length}): ${abriram.map((o) => o.nome).join(", ") || "ninguém"}`,
    `❌ Não abriram (${naoAbriram.length}): ${naoAbriram.map((o) => o.nome).join(", ") || "ninguém"}`,
  ].join("\n");

  const resultado = await enviarPushParaTodos({
    titulo: `Relatório de turnos — ${hoje}`,
    corpo,
    url: "/",
  });

  return NextResponse.json({ sucesso: true, hoje, abriram: abriram.length, naoAbriram: naoAbriram.length, ...resultado });
}
