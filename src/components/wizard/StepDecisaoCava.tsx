interface Props {
  cava: number;
  onVoltar: () => void;
  onAdicionarCava: () => void;
  onEncerrarTurno: () => void;
}

export default function StepDecisaoCava({ cava, onVoltar, onAdicionarCava, onEncerrarTurno }: Props) {
  return (
    <>
      <div className="passo-titulo">Cava {cava} registrada</div>
      <div className="passo-sub">O que você quer fazer agora?</div>

      <button
        type="button"
        className="btn-avancar"
        style={{ width: "100%", marginBottom: 14 }}
        onClick={onAdicionarCava}
      >
        ➕ Adicionar mais uma cava
      </button>
      <button type="button" className="btn-enviar" style={{ width: "100%" }} onClick={onEncerrarTurno}>
        ✅ Encerrar Turno
      </button>

      <div className="rodape">
        <button className="btn-voltar" onClick={onVoltar}>
          ← Voltar
        </button>
      </div>
    </>
  );
}
