import { salvarTurno, type TurnoRegistro } from "@/lib/idb/turnosDb";
import { enviarFotoComTimeout } from "./enviarFotoComTimeout";
import { registrarCava } from "./registrarCava";
import { encerrarTurnoNoServidor } from "./turnosServidor";

export interface ResultadoSync {
  sucesso: boolean;
  erro?: string;
}

function agruparPorCava(fotos: TurnoRegistro["fotos"]): Map<number, TurnoRegistro["fotos"]> {
  const porCava = new Map<number, TurnoRegistro["fotos"]>();
  for (const foto of fotos) {
    const lista = porCava.get(foto.cava) ?? [];
    lista.push(foto);
    porCava.set(foto.cava, lista);
  }
  return porCava;
}

// Cada cava já vira um registro no banco assim que fecha (ver WizardShell,
// avancarDeFotos). Esta função é o "fecho": garante que nenhuma cava ficou
// sem registrar (ex: falhou por falta de sinal na hora), aplica a observação
// em todas as cavas do turno e encerra o turno no servidor. Usado tanto no
// "Registrar" do wizard quanto no botão "Sincronizar" da tela de Turnos em
// Aberto.
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
    let resultado: { url: string };
    try {
      const nomeArquivo = `obra_${turno.obra}/cava${foto.cava}_foto${foto.fotoNum}_${Date.now()}.jpg`;
      resultado = await enviarFotoComTimeout(nomeArquivo, foto.blob);
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

    fotos[i] = { ...foto, uploadedUrl: resultado.url };
    feitas++;
    onProgress?.(feitas, total);

    try {
      await salvarTurno({ ...turno, fotos, id: turno.id });
    } catch (err) {
      const detalhe = err instanceof Error ? err.message : String(err);
      return {
        sucesso: false,
        erro: `Foto enviada, mas falhou ao salvar o progresso no aparelho (${detalhe}). Toque em Sincronizar de novo.`,
      };
    }
  }

  const cavasRegistradas = new Set(turno.cavasRegistradas ?? []);
  const porCava = agruparPorCava(fotos);

  for (const [cava, fotosCava] of porCava) {
    if (cavasRegistradas.has(cava)) continue;
    const resultado = await registrarCava(
      {
        data: turno.data,
        obra: turno.obra,
        tipoCava: turno.tipoCava,
        operador: turno.operador,
        cpf: turno.cpf,
        turnoServerId: turno.serverId,
      },
      fotosCava
    );
    if (!resultado.sucesso) {
      return { sucesso: false, erro: resultado.erro || `Falha ao registrar a cava ${cava}. Toque em Sincronizar de novo.` };
    }
    cavasRegistradas.add(cava);
    try {
      await salvarTurno({ ...turno, fotos, cavasRegistradas: [...cavasRegistradas], id: turno.id });
    } catch {
      // não impede de seguir — a cava já está registrada no servidor, só não
      // conseguimos anotar isso localmente agora; na pior das hipóteses tenta
      // registrar nela de novo numa próxima sincronização (server ignora
      // duplicata? não — mas nesse ponto o turno já está sendo encerrado)
    }
  }

  if (turno.serverId) {
    try {
      await fetch(`/api/registros/turno/${turno.serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: turno.cpf, observacao: turno.observacao }),
      });
    } catch {
      // melhor esforço — observação é só um complemento, não bloqueia o encerramento
    }
    await encerrarTurnoNoServidor(turno.serverId, turno.cpf);
  }

  return { sucesso: true };
}
