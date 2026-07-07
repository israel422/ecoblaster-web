interface Props {
  nome: string;
  onVoltar: () => void;
  onAvancar: () => void;
}

export default function StepOperador({ nome, onVoltar, onAvancar }: Props) {
  return (
    <>
      <div className="passo-titulo">Operador</div>
      <div className="passo-sub">Identificado pelo CPF</div>
      <div className="operador-card">
        <div className="operador-label">Operador logado</div>
        <div className="operador-nome">{nome}</div>
      </div>
      <div className="rodape">
        <button className="btn-voltar" onClick={onVoltar}>
          ← Voltar
        </button>
        <button className="btn-avancar" onClick={onAvancar}>
          Avançar →
        </button>
      </div>
    </>
  );
}
