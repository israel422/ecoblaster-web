import type { FotoItem } from "@/types";
import { enviarFotoComTimeout } from "./enviarFotoComTimeout";

// Sobe pro servidor as fotos de uma cava assim que ela é fechada (em vez de
// esperar o "Enviar" no fim do turno inteiro) — reduz o risco de perder tudo
// se o aparelho travar/perder antes do envio final. É best-effort: falha aqui
// não interrompe o usuário nem trava o wizard, porque o envio final
// (sincronizarTurno) tenta de novo qualquer foto que ainda não tenha
// uploadedUrl.
export async function enviarFotosEmSegundoPlano(obra: string, fotos: FotoItem[]): Promise<FotoItem[]> {
  const resultado = [...fotos];

  for (let i = 0; i < resultado.length; i++) {
    const foto = resultado[i];
    if (foto.uploadedUrl || !foto.blob) continue;
    try {
      const nomeArquivo = `obra_${obra}/cava${foto.cava}_foto${foto.fotoNum}_${Date.now()}.jpg`;
      const { url } = await enviarFotoComTimeout(nomeArquivo, foto.blob);
      resultado[i] = { ...foto, uploadedUrl: url };
    } catch {
      // ignora — o envio final do turno tenta de novo
    }
  }

  return resultado;
}
