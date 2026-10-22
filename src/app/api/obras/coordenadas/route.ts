import { NextResponse } from "next/server";
import { buscarOperador } from "@/lib/config/operadores";
import { todasCoordenadas } from "@/lib/obras/coordenadaCronograma";

// Lista de coordenadas de todas as obras (cópia diária do cronograma). O celular guarda e usa
// sem internet quando o GPS falha. Só para operadores cadastrados.
export async function GET(req: Request) {
  if (!buscarOperador(new URL(req.url).searchParams.get("cpf") || "")) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  return NextResponse.json(await todasCoordenadas());
}
