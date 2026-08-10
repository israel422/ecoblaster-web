import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary/cloudinaryClient";

// Recebe a foto direto no corpo da requisição e sobe pro Cloudinary a partir do
// servidor (não do navegador) — assim o upload passa pelo mesmo domínio do
// app, evitando bloqueios de rede a domínios externos de armazenamento.
// Trocado do Vercel Blob pro Cloudinary em 2026-08-10: o Blob do plano Hobby
// bateu no limite de 2.000 operações avançadas/mês (1 por foto enviada) e
// suspendeu a store — volume real de fotos de campo excede esse teto todo mês.
export async function POST(request: Request): Promise<NextResponse> {
  const nomeArquivo = new URL(request.url).searchParams.get("nome");
  if (!nomeArquivo) {
    return NextResponse.json({ erro: "Nome do arquivo faltando" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    const resultado = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "ecoblaster", resource_type: "image" },
        (erro, resultado) => (erro || !resultado ? reject(erro) : resolve(resultado))
      );
      stream.end(buffer);
    });
    return NextResponse.json({ url: resultado.secure_url });
  } catch (error) {
    return NextResponse.json({ erro: (error as Error).message }, { status: 500 });
  }
}
