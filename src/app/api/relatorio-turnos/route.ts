import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/config/operadores";
import { obterRelatorioTurnos, hojeBR } from "@/lib/turnos/relatorioTurnos";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const data = searchParams.get("data") || hojeBR();
  const relatorio = await obterRelatorioTurnos(data);
  return NextResponse.json(relatorio);
}
