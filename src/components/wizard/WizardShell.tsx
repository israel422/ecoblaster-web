"use client";

import { useState } from "react";
import type { SessaoOperador, DadosRegistro } from "@/types";
import Progresso from "./Progresso";
import StepObra from "./StepObra";
import StepData from "./StepData";
import StepOperador from "./StepOperador";
import StepTipoCava from "./StepTipoCava";
import StepTotalCavas from "./StepTotalCavas";

const TOTAL_PASSOS = 7;

function hojeISO(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

export default function WizardShell({ sessao }: { sessao: SessaoOperador }) {
  const [passo, setPasso] = useState(1);
  const [dados, setDados] = useState<DadosRegistro>({
    obra: "",
    data: hojeISO(),
    tipoCava: "",
    totalCavas: "",
    observacao: "",
  });
  const [erroObra, setErroObra] = useState(false);
  const [erroTipo, setErroTipo] = useState(false);
  const [erroTotal, setErroTotal] = useState(false);

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
    setPasso(n);
  }

  return (
    <div className="tela">
      <Progresso passo={passo} total={TOTAL_PASSOS} />

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
        <>
          <div className="passo-titulo">Fotos das Cavas</div>
          <div className="passo-sub">
            {dados.totalCavas} cava(s) · Tipo: {dados.tipoCava}
          </div>
          <div className="passo-sub" style={{ color: "#1a73e8" }}>
            🚧 Checklist de fotos entra na próxima etapa da migração.
          </div>
          <div className="rodape">
            <button className="btn-voltar" onClick={() => irPara(5)}>
              ← Voltar
            </button>
          </div>
        </>
      )}

      <p style={{ marginTop: 40, fontSize: 12, color: "#aaa", textAlign: "center" }}>
        Dados atuais (debug): {JSON.stringify(dados)}
      </p>
    </div>
  );
}
