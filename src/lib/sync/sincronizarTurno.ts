import { salvarTurno, type TurnoRegistro } from "@/lib/idb/turnosDb";

export interface ResultadoSync {
  sucesso: boolean;
  erro?: string;
}

const TIMEOUT_MS = 45_000;

// Envia uma foto com um limite de tempo — sem isso, em conexão lenta o navegador
// pode ficar esperando a requisição indefinidamente e a tela parece travada.
// Tenta de novo até 3 vezes antes de desistir.
async function enviarFotoComTimeout(nomeArquivo: string, blob: Blob): Promise<{ url: string }> {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(`/api/fotos?nome=${encodeURIComponent(nomeArquivo)}`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
        signal: controller.signal,
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}) as { erro?: string });
        throw new Error(json.erro || `Erro HTTP ${resp.status}`);
      }
      const json = (await resp.json()) as { url: string };
      return { url: json.url };
    } catch (err) {
      if (tentativa === 3) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Falha ao enviar após tentativas");
}

// Envia as fotos ainda não enviadas (uma de cada vez, persistindo a URL local a
// cada sucesso pra não perder progresso se a conexão cair no meio), depois
// registra o turno de vez no banco. Usado tanto no "Registrar" do wizard quanto
// no botão "Sincronizar" da tela de Turnos em Aberto.
export async function sincronizarTurno(
  turno: TurnoRegistro,
  onProgress?: (feitas: number, total: number) => void
): Promise<ResultadoSync> {
  const fotos = [...turno.fotos];
  const total = fotos.length;
  let feitas = fotos.filter((f) => f.uploadedUrl).length;
  onProgress?.(feitas, total);

  for (let i = 0; i < fotos.length; i++) {
    const foto = fotos[i];
    if (foto.uploadedUrl) continue;
    if (!foto.blob) {
      return { sucesso: false, erro: `Falta tirar a foto: ${foto.label} (cava ${foto.cava})` };
    }
    try {
      const nomeArquivo = `obra_${turno.obra}/cava${foto.cava}_foto${foto.fotoNum}_${Date.now()}.jpg`;
      const resultado = await enviarFotoComTimeout(nomeArquivo, foto.blob);
      fotos[i] = { ...foto, uploadedUrl: resultado.url };
      feitas++;
      onProgress?.(feitas, total);
      await salvarTurno({ ...turno, fotos, id: turno.id });
    } catch (err) {
      const abortou = err instanceof DOMException && err.name === "AbortError";
      const detalhe = abortou
        ? "sinal fraco, a foto não terminou de enviar"
        : err instanceof Error
          ? err.message
          : String(err);
      return {
        sucesso: false,
        erro: `Falha ao enviar foto (${detalhe}). O que já enviou foi salvo, toque em Sincronizar de novo quando o sinal melhorar.`,
      };
    }
  }

  const payload = {
    data: turno.data,
    obra: turno.obra,
    tipoCava: turno.tipoCava,
    totalCavas: Number(turno.totalCavas),
    operador: turno.operador,
    cpf: turno.cpf,
    observacao: turno.observacao,
    fotos: fotos.map((f) => ({ cava: f.cava, fotoNum: f.fotoNum, label: f.label, url: f.uploadedUrl! })),
    turnoServerId: turno.serverId,
  };

  try {
    const resp = await fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok || !json.sucesso) {
      return { sucesso: false, erro: json.erro || "Erro ao salvar registro." };
    }
    return { sucesso: true };
  } catch {
    return { sucesso: false, erro: "Sem conexão. As fotos já foram enviadas, tente registrar de novo quando tiver internet." };
  }
}
