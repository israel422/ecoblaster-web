import { NextResponse } from "next/server";
import { buscarOperador } from "@/lib/config/operadores";
import { coordenadaDaObra } from "@/lib/obras/coordenadaCronograma";

// Coordenada da obra no Cronograma de Obras (plano B do GPS das fotos). Só para operadores cadastrados.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!buscarOperador(searchParams.get("cpf") || "")) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const c = await coordenadaDaObra(searchParams.get("obra") || "");
  return c ? NextResponse.json(c) : NextResponse.json({ erro: "Obra sem coordenada no cronograma" }, { status: 404 });
}
