"use client";

import { useRef, useState } from "react";
import type { SessaoOperador, DadosRegistro, FotoItem } from "@/types";
import { montarFotos } from "@/lib/wizard/montarFotos";
import { salvarTurno, apagarTurno, type TurnoRegistro } from "@/lib/idb/turnosDb";
import { registrarTurnoAbertoNoServidor } from "@/lib/sync/turnosServidor";
import { sincronizarTurno } from "@/lib/sync/sincronizarTurno";
import Progresso from "./Progresso";
import StepObra from "./StepObra";
import StepData from "./StepData";
import StepOperador from "./StepOperador";
import StepTipoCava from "./StepTipoCava";
import StepTotalCavas from "./StepTotalCavas";
import StepFotos from "./StepFotos";
import StepObservacao from "./StepObservacao";

const TOTAL_PASSOS = 7;

function hojeISO(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

interface Props {
  sessao: SessaoOperador;
  turnoInicial?: TurnoRegistro | null;
  passoInicial?: number;
  onAbrirPainel?: () => void;
}

export default function WizardShell({ sessao, turnoInicial, passoInicial, onAbrirPainel }: Props) {
  const [passo, setPasso] = useState(passoInicial ?? 1);
  const [dados, setDados] = useState<DadosRegistro>(
    turnoInicial
      ? {
          obra: turnoInicial.obra,
          data: turnoInicial.data,
          tipoCava: turnoInicial.tipoCava,
          totalCavas: turnoInicial.totalCavas,
          observacao: turnoInicial.observacao,
        }
      : { obra: "", data: hojeISO(), tipoCava: "", totalCavas: "", observacao: "" }
  );
  const [fotos, setFotos] = useState<FotoItem[]>(turnoInicial?.fotos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const turnoIdRef = useRef<number | undefined>(turnoInicial?.id);
  const serverIdRef = useRef<string | undefined>(turnoInicial?.serverId);
  const fotosGeradasPara = useRef<{ tipo: string; total: string } | null>(
    turnoInicial ? { tipo: turnoInicial.tipoCava, total: turnoInicial.totalCavas } : null
  );

  const [erroObra, setErroObra] = useState(false);
  const [erroTipo, setErroTipo] = useState(false);
  const [erroTotal, setErroTotal] = useState(false);
  const [erroFotos, setErroFotos] = useState(false);

  async function persistirTurno(fotosAtuais: FotoItem[]) {
    const eraNovo = !turnoIdRef.current;
    const turno: TurnoRegistro = {
      id: turnoIdRef.current,
      serverId: serverIdRef.current,
      cpf: sessao.cpf,
      operador: sessao.nome,
      obra: dados.obra,
      data: dados.data,
      tipoCava: dados.tipoCava,
      totalCavas: dados.totalCavas,
      observacao: dados.observacao,
      fotos: fotosAtuais,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
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
    if (n === 5 && !dados.tipoCava) {
      setErroTipo(true);
      setTimeout(() => setErroTipo(false), 2500);
      return;
    }
    if (n === 6 && !dados.totalCavas) {
      setErroTotal(true);
      setTimeout(() => setErroTotal(false), 2500);
      return;
    }

    let fotosParaUsar = fotos;
    if (n === 6) {
      const jaGerado =
        fotosGeradasPara.current?.tipo === dados.tipoCava && fotosGeradasPara.current?.total === dados.totalCavas;
      if (!jaGerado || fotos.length === 0) {
        fotosParaUsar = montarFotos(dados.tipoCava, dados.totalCavas);
        fotosGeradasPara.current = { tipo: dados.tipoCava, total: dados.totalCavas };
        setFotos(fotosParaUsar);
      }
    }

    if (n === 7 && !(fotos.length > 0 && fotos.every((f) => f.blob))) {
      setErroFotos(true);
      setTimeout(() => setErroFotos(false), 3000);
      return;
    }

    if (n >= 6) {
      persistirTurno(fotosParaUsar);
    }

    setPasso(n);
  }

  function atualizarFotos(novaLista: FotoItem[]) {
    setFotos(novaLista);
    persistirTurno(novaLista);
  }

  async function enviar() {
    setEnviando(true);
    setErroEnvio(null);
    setProgresso(null);

    const turno: TurnoRegistro = {
      id: turnoIdRef.current,
      serverId: serverIdRef.current,
      cpf: sessao.cpf,
      operador: sessao.nome,
      obra: dados.obra,
      data: dados.data,
      tipoCava: dados.tipoCava,
      totalCavas: dados.totalCavas,
      observacao: dados.observacao,
      fotos,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
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
          Obra {dados.obra} · {dados.tipoCava} · {dados.totalCavas} cavas
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
          onSelecionar={(tipoCava) => setDados((d) => ({ ...d, tipoCava }))}
          erro={erroTipo}
          onVoltar={() => irPara(3)}
          onAvancar={() => irPara(5)}
        />
      )}

      {passo === 5 && (
        <StepTotalCavas
          valor={dados.totalCavas}
          onMudar={(totalCavas) => setDados((d) => ({ ...d, totalCavas }))}
          erro={erroTotal}
          onVoltar={() => irPara(4)}
          onAvancar={() => irPara(6)}
        />
      )}

      {passo === 6 && (
        <StepFotos
          obra={dados.obra}
          tipoCava={dados.tipoCava}
          totalCavas={dados.totalCavas}
          operador={sessao.nome}
          fotos={fotos}
          onFotosChange={atualizarFotos}
          erro={erroFotos}
          onVoltar={() => irPara(5)}
          onAvancar={() => irPara(7)}
        />
      )}

      {passo === 7 && (
        <StepObservacao
          valor={dados.observacao}
          onMudar={(observacao) => setDados((d) => ({ ...d, observacao }))}
          enviando={enviando}
          progresso={progresso}
          erro={erroEnvio}
          onVoltar={() => irPara(6)}
          onEnviar={enviar}
        />
      )}
    </div>
  );
}
