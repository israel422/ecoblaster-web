import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { turnosAbertos } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";
import { enviarPushParaCpf } from "@/lib/push/enviarPush";
import { hojeBR } from "@/lib/turnos/relatorioTurnos";

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

// Vercel Cron, todo dia às 6h de Recife (09:00 UTC): avisa cada operador que ainda está com turno de
// dia anterior aberto — ele precisa terminar/enviar as fotos (fechar) antes de iniciar o de hoje.
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const hoje = hojeBR();
  const abertos = await db
    .select({ cpf: turnosAbertos.cpf, obra: turnosAbertos.obra, data: turnosAbertos.data })
    .from(turnosAbertos)
    .where(and(eq(turnosAbertos.ativo, true), lt(turnosAbertos.data, hoje)));
  const porCpf = new Map<string, { obra: string; data: string }[]>();
  for (const t of abertos) {
    if (isAdmin(t.cpf)) continue;
    porCpf.set(t.cpf, [...(porCpf.get(t.cpf) ?? []), { obra: t.obra, data: String(t.data) }]);
  }
  let enviados = 0;
  for (const [cpf, lista] of porCpf) {
    const txt = lista.map((t) => `obra ${t.obra} (${dataBR(t.data)})`).join(", ");
    const r = await enviarPushParaCpf(cpf, {
      titulo: "📋 Turno de ontem ainda aberto",
      corpo: `Você está com turno aberto: ${txt}. Termine e envie as fotos para fechar antes de iniciar o turno de hoje.`,
      url: "/",
    }).catch((err) => {
      console.error("Falha no aviso de turno aberto:", err);
      return { enviados: 0 };
    });
    enviados += r.enviados;
  }
  return NextResponse.json({ sucesso: true, operadores: porCpf.size, turnos: abertos.length, notificacoes: enviados });
}
