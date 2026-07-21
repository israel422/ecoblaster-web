import { NextResponse } from "next/server";
import { obterRelatorioTurnos, hojeBR } from "@/lib/turnos/relatorioTurnos";
import { enviarPushParaTodos } from "@/lib/push/enviarPush";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const relatorio = await obterRelatorioTurnos(hojeBR());

  const corpo = [
    `✅ Abriram (${relatorio.abriram.length}): ${relatorio.abriram.map((o) => o.nome).join(", ") || "ninguém"}`,
    `❌ Não abriram (${relatorio.naoAbriram.length}): ${relatorio.naoAbriram.map((o) => o.nome).join(", ") || "ninguém"}`,
  ].join("\n");

  const resultado = await enviarPushParaTodos({
    titulo: `Relatório de turnos — ${relatorio.data}`,
    corpo,
    url: "/?tela=relatorio-turnos",
  });

  return NextResponse.json({
    sucesso: true,
    hoje: relatorio.data,
    abriram: relatorio.abriram.length,
    naoAbriram: relatorio.naoAbriram.length,
    ...resultado,
  });
}
