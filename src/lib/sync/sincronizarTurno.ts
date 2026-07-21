import { salvarTurno, type TurnoRegistro } from "@/lib/idb/turnosDb";
import { enviarFotoComTimeout } from "./enviarFotoComTimeout";
import { registrarCava, chaveCava } from "./registrarCava";
import { encerrarTurnoNoServidor } from "./turnosServidor";

export interface ResultadoSync {
  sucesso: boolean;
  erro?: string;
}

interface GrupoCava {
  cava: number;
  tipoCava: string;
  fotos: TurnoRegistro["fotos"];
}

// Agrupa por tipo+cava, não só por número — a numeração da cava reinicia em 1
// sempre que o tipo muda no meio do turno (ver WizardShell.selecionarTipoEAvancar).
function agruparPorCava(fotos: TurnoRegistro["fotos"]): Map<string, GrupoCava> {
  const porCava = new Map<string, GrupoCava>();
  for (const foto of fotos) {
    const chave = chaveCava(foto.tipoCava, foto.cava);
    const grupo = porCava.get(chave) ?? { cava: foto.cava, tipoCava: foto.tipoCava, fotos: [] };
    grupo.fotos.push(foto);
    porCava.set(chave, grupo);
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

  for (const [chave, grupo] of porCava) {
    if (cavasRegistradas.has(chave)) continue;
    const resultado = await registrarCava(
      {
        data: turno.data,
        obra: turno.obra,
        tipoCava: grupo.tipoCava,
        operador: turno.operador,
        cpf: turno.cpf,
        turnoServerId: turno.serverId,
      },
      grupo.fotos
    );
    if (!resultado.sucesso) {
      return {
        sucesso: false,
        erro: resultado.erro || `Falha ao registrar a cava ${grupo.cava} (${grupo.tipoCava}). Toque em Sincronizar de novo.`,
      };
    }
    cavasRegistradas.add(chave);
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
