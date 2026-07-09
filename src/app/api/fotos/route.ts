import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

// Recebe a foto direto no corpo da requisição e sobe pro Blob a partir do
// servidor (não do navegador) — assim o upload passa pelo mesmo domínio do
// app, evitando bloqueios de rede a domínios externos de armazenamento.
export async function POST(request: Request): Promise<NextResponse> {
  const nomeArquivo = new URL(request.url).searchParams.get("nome");
  if (!nomeArquivo) {
    return NextResponse.json({ erro: "Nome do arquivo faltando" }, { status: 400 });
  }

  try {
    const buffer = await request.arrayBuffer();
    const resultado = await put(nomeArquivo, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/jpeg",
    });
    return NextResponse.json({ url: resultado.url });
  } catch (error) {
    return NextResponse.json({ erro: (error as Error).message }, { status: 500 });
  }
}
