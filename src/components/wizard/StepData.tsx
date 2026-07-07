interface Props {
  valor: string;
  onMudar: (data: string) => void;
  onVoltar: () => void;
  onAvancar: () => void;
}

export default function StepData({ valor, onMudar, onVoltar, onAvancar }: Props) {
  return (
    <>
      <div className="passo-titulo">Qual a data?</div>
      <div className="passo-sub">Data da execução</div>
      <input
        type="date"
        className="campo-grande"
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
      />
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
