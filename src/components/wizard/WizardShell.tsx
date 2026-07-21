"use client";

import { useEffect, useRef, useState } from "react";
import type { SessaoOperador, DadosRegistro, FotoItem } from "@/types";
import { montarFotosParaCava } from "@/lib/wizard/montarFotos";
import { salvarTurno, apagarTurno, marcarCavaRegistrada, type TurnoRegistro } from "@/lib/idb/turnosDb";
import { registrarTurnoAbertoNoServidor } from "@/lib/sync/turnosServidor";
import { sincronizarTurno } from "@/lib/sync/sincronizarTurno";
import { enviarFotosEmSegundoPlano } from "@/lib/sync/enviarFotosEmSegundoPlano";
import { registrarCava } from "@/lib/sync/registrarCava";
import Progresso from "./Progresso";
import StepObra from "./StepObra";
import StepData from "./StepData";
import StepOperador from "./StepOperador";
import StepTipoCava from "./StepTipoCava";
import StepFotos from "./StepFotos";
import StepDecisaoCava from "./StepDecisaoCava";
import StepObservacao from "./StepObservacao";

const TOTAL_PASSOS = 7;

function hojeISO(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

function contarCavas(fotos: FotoItem[]): number {
  return new Set(fotos.map((f) => f.cava)).size || 1;
}

interface Props {
  sessao: SessaoOperador;
  turnoInicial?: TurnoRegistro | null;
  passoInicial?: number;
  onAbrirPainel?: () => void;
  onVoltarInicio?: () => void;
}

export default function WizardShell({ sessao, turnoInicial, passoInicial, onAbrirPainel, onVoltarInicio }: Props) {
  const [passo, setPasso] = useState(passoInicial ?? 1);
  const [dados, setDados] = useState<DadosRegistro>(
    turnoInicial
      ? {
          obra: turnoInicial.obra,
          data: turnoInicial.data,
          tipoCava: turnoInicial.tipoCava,
          observacao: turnoInicial.observacao,
        }
      : { obra: "", data: hojeISO(), tipoCava: "", observacao: "" }
  );
  const [fotos, setFotos] = useState<FotoItem[]>(turnoInicial?.fotos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const turnoIdRef = useRef<number | undefined>(turnoInicial?.id);
  const serverIdRef = useRef<string | undefined>(turnoInicial?.serverId);
  const tipoGeradoRef = useRef<string | null>(turnoInicial ? turnoInicial.tipoCava : null);
  const cavasRegistradasRef = useRef<Set<number>>(new Set(turnoInicial?.cavasRegistradas ?? []));
  const fotosRef = useRef(fotos);
  const processamentosPendentesRef = useRef<Promise<void>[]>([]);

  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);

  const [erroObra, setErroObra] = useState(false);
  const [erroFotos, setErroFotos] = useState(false);

  async function persistirTurno(fotosAtuais: FotoItem[], tipoCavaAtual?: string) {
    const eraNovo = !turnoIdRef.current;
    const turno: TurnoRegistro = {
      id: turnoIdRef.current,
      serverId: serverIdRef.current,
      cpf: sessao.cpf,
      operador: sessao.nome,
      obra: dados.obra,
      data: dados.data,
      tipoCava: tipoCavaAtual ?? dados.tipoCava,
      totalCavas: String(contarCavas(fotosAtuais)),
      observacao: dados.observacao,
      fotos: fotosAtuais,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      cavasRegistradas: [...cavasRegistradasRef.current],
    };
    const id = await salvarTurno(turno);
    turnoIdRef.current = id;

    if (eraNovo) {
      const serverId = await registrarTurnoAbertoNoServidor(sessao.cpf, dados.obra, dados.data);
      if (serverId) {
        serverIdRef.current = serverId;
        await salvarTurno({ ...turno, id, serverId });
      }
    }
  }

  function irPara(n: number) {
    if (n === 2 && !dados.obra) {
      setErroObra(true);
      setTimeout(() => setErroObra(false), 2500);
      return;
    }
    setPasso(n);
  }

  function selecionarTipoEAvancar(tipoCava: string) {
    setDados((d) => ({ ...d, tipoCava }));

    if (fotos.length === 0 || tipoGeradoRef.current !== tipoCava) {
      const fotosDaCava1 = montarFotosParaCava(tipoCava, 1);
      tipoGeradoRef.current = tipoCava;
      setFotos(fotosDaCava1);
      persistirTurno(fotosDaCava1, tipoCava);
    }

    setPasso(5);
  }

  function avancarDeFotos() {
    if (!(fotos.length > 0 && fotos.every((f) => f.blob))) {
      setErroFotos(true);
      setTimeout(() => setErroFotos(false), 3000);
      return;
    }
    const cavaFechada = Math.max(...fotos.map((f) => f.cava));
    persistirTurno(fotos);
    processarCavaEmSegundoPlano(cavaFechada, fotos);
    setPasso(6);
  }

  // Ao fechar uma cava (avançar), sobe as fotos dela e já cria o registro no
  // banco pra aquela cava — não espera o "Enviar" no fim do turno inteiro.
  // Roda em segundo plano (não trava a navegação): falha aqui não bloqueia o
  // usuário, o "Enviar" final tenta de novo qualquer cava ainda não
  // registrada. Faz merge por cava+fotoNum no estado (nunca substitui o
  // array inteiro), pra não sobrescrever uma cava nova que o usuário já
  // tenha começado enquanto isso ainda estava em andamento.
  function processarCavaEmSegundoPlano(cava: number, fotosDaCava: FotoItem[]) {
    const promessa = enviarFotosEmSegundoPlano(dados.obra, fotosDaCava).then(async (atualizadas) => {
      setFotos((atual) => {
        const mesclado = atual.map((f) => {
          if (f.uploadedUrl) return f;
          const upd = atualizadas.find((a) => a.cava === f.cava && a.fotoNum === f.fotoNum);
          return upd?.uploadedUrl ? { ...f, uploadedUrl: upd.uploadedUrl } : f;
        });
        persistirTurno(mesclado);
        return mesclado;
      });

      if (cavasRegistradasRef.current.has(cava)) return;
      const fotosDaCavaAtualizadas = atualizadas.filter((f) => f.cava === cava);
      if (fotosDaCavaAtualizadas.length === 0 || !fotosDaCavaAtualizadas.every((f) => f.uploadedUrl)) return;

      const resultado = await registrarCava(
        { data: dados.data, obra: dados.obra, tipoCava: dados.tipoCava, operador: sessao.nome, cpf: sessao.cpf, turnoServerId: serverIdRef.current },
        fotosDaCavaAtualizadas
      );
      if (resultado.sucesso) {
        cavasRegistradasRef.current.add(cava);
        if (turnoIdRef.current) await marcarCavaRegistrada(turnoIdRef.current, cava);
      }
    });

    // "Enviar" (no fim do turno) espera esses processamentos terminarem antes
    // de seguir — sem isso, se o usuário for rápido (encerra e envia antes do
    // upload/registro da última cava terminar), a cava podia acabar sendo
    // registrada duas vezes (uma aqui, outra no envio final).
    processamentosPendentesRef.current.push(promessa);
    promessa.finally(() => {
      processamentosPendentesRef.current = processamentosPendentesRef.current.filter((p) => p !== promessa);
    });
  }

  function adicionarCava() {
    const proximaCava = Math.max(...fotos.map((f) => f.cava)) + 1;
    const fotosNovaCava = montarFotosParaCava(dados.tipoCava, proximaCava);
    const novaLista = [...fotos, ...fotosNovaCava];
    setFotos(novaLista);
    persistirTurno(novaLista);
    setPasso(5);
  }

  function encerrarTurno() {
    setPasso(7);
  }

  function atualizarFotos(novaLista: FotoItem[]) {
    setFotos(novaLista);
    persistirTurno(novaLista);
  }

  async function enviar() {
    setEnviando(true);
    setErroEnvio(null);
    setProgresso(null);

    // espera qualquer registro de cava ainda em andamento em segundo plano
    // terminar, senão o envio final pode disputar/duplicar registro com ele
    await Promise.all(processamentosPendentesRef.current);

    const turno: TurnoRegistro = {
      id: turnoIdRef.current,
      serverId: serverIdRef.current,
      cpf: sessao.cpf,
      operador: sessao.nome,
      obra: dados.obra,
      data: dados.data,
      tipoCava: dados.tipoCava,
      totalCavas: String(contarCavas(fotosRef.current)),
      observacao: dados.observacao,
      fotos: fotosRef.current,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      cavasRegistradas: [...cavasRegistradasRef.current],
    };

    const resultado = await sincronizarTurno(turno, (feitas, total) => setProgresso({ feitas, total }));

    if (resultado.sucesso) {
      if (turnoIdRef.current) await apagarTurno(turnoIdRef.current);
      setSucesso(true);
    } else {
      setErroEnvio(resultado.erro || "Erro ao enviar. Tente novamente.");
    }
    setEnviando(false);
  }

  if (sucesso) {
    return (
      <div className="sucesso-tela">
        <div className="sucesso-icon">✅</div>
        <div className="sucesso-titulo">Registrado!</div>
        <div className="sucesso-sub">
          Obra {dados.obra} · {dados.tipoCava} · {contarCavas(fotos)} cava(s)
        </div>
        <button className="btn-novo" onClick={() => window.location.reload()}>
          Novo Registro
        </button>
      </div>
    );
  }

  return (
    <div className="tela">
      <Progresso passo={passo} total={TOTAL_PASSOS} />

      {sessao.admin && onAbrirPainel && (
        <button
          type="button"
          onClick={onAbrirPainel}
          style={{
            position: "fixed",
            top: 8,
            right: 12,
            fontSize: 12,
            color: "#1a73e8",
            zIndex: 50,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          ☰ Menu
        </button>
      )}

      {passo === 1 && (
        <StepObra
          valor={dados.obra}
          onSelecionar={(obra) => setDados((d) => ({ ...d, obra }))}
          erro={erroObra}
          onVoltar={onVoltarInicio}
          onAvancar={() => irPara(2)}
        />
      )}

      {passo === 2 && (
        <StepData
          valor={dados.data}
          onMudar={(data) => setDados((d) => ({ ...d, data }))}
          onVoltar={() => irPara(1)}
          onAvancar={() => irPara(3)}
        />
      )}

      {passo === 3 && <StepOperador nome={sessao.nome} onVoltar={() => irPara(2)} onAvancar={() => irPara(4)} />}

      {passo === 4 && (
        <StepTipoCava
          categoria={sessao.categoria}
          valor={dados.tipoCava}
          onSelecionar={selecionarTipoEAvancar}
          onVoltar={() => irPara(3)}
        />
      )}

      {passo === 5 && (
        <StepFotos
          obra={dados.obra}
          tipoCava={dados.tipoCava}
          operador={sessao.nome}
          fotos={fotos}
          onFotosChange={atualizarFotos}
          erro={erroFotos}
          onVoltar={() => irPara(4)}
          onAvancar={avancarDeFotos}
        />
      )}

      {passo === 6 && (
        <StepDecisaoCava
          cava={Math.max(...fotos.map((f) => f.cava), 1)}
          onVoltar={() => setPasso(5)}
          onAdicionarCava={adicionarCava}
          onEncerrarTurno={encerrarTurno}
        />
      )}

      {passo === 7 && (
        <StepObservacao
          valor={dados.observacao}
          onMudar={(observacao) => setDados((d) => ({ ...d, observacao }))}
          enviando={enviando}
          progresso={progresso}
          erro={erroEnvio}
          onVoltar={() => setPasso(6)}
          onEnviar={enviar}
        />
      )}
    </div>
  );
}
