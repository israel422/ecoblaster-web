interface Props {
  valor: string;
  onMudar: (v: string) => void;
  enviando: boolean;
  erro: string | null;
  onVoltar: () => void;
  onEnviar: () => void;
}

export default function StepObservacao({ valor, onMudar, enviando, erro, onVoltar, onEnviar }: Props) {
  return (
    <>
      <div className="passo-titulo">Observação</div>
      <div className="passo-sub">Algum detalhe adicional? (opcional)</div>
      <textarea
        className="campo-grande"
        placeholder="Ex: Solo rochoso, chuva no dia..."
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
      />
      {erro && <div className="erro-inline">{erro}</div>}
      <div className="rodape">
        <button className="btn-voltar" onClick={onVoltar} disabled={enviando}>
          ← Voltar
        </button>
        <button className="btn-enviar" onClick={onEnviar} disabled={enviando}>
          {enviando ? "Enviando..." : "✅ Registrar"}
        </button>
      </div>
    </>
  );
}
