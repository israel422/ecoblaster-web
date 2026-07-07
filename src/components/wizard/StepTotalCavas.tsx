interface Props {
  valor: string;
  onMudar: (v: string) => void;
  erro: boolean;
  onVoltar: () => void;
  onAvancar: () => void;
}

export default function StepTotalCavas({ valor, onMudar, erro, onVoltar, onAvancar }: Props) {
  return (
    <>
      <div className="passo-titulo">Total de Cavas</div>
      <div className="passo-sub">Quantas cavas foram executadas?</div>
      <input
        type="number"
        className="campo-grande"
        min={1}
        max={999}
        placeholder="Ex: 3"
        style={{ textAlign: "center", fontSize: 28, fontWeight: 700 }}
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
      />
      {erro && <div className="erro-inline">Informe a quantidade de cavas.</div>}
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
