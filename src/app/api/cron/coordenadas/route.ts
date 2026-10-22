import { NextResponse } from "next/server";
import { atualizarCoordenadas } from "@/lib/obras/coordenadaCronograma";

// Vercel Cron, todo dia às 5h de Recife (08:00 UTC): copia as coordenadas das obras do
// Cronograma de Obras para o banco do app (plano B do GPS das fotos).
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json({ sucesso: true, ...(await atualizarCoordenadas()) });
  } catch (err) {
    console.error("Falha no cron de coordenadas:", err);
    return NextResponse.json({ sucesso: false, erro: String(err) }, { status: 500 });
  }
}
