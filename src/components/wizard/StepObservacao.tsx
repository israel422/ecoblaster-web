interface Props {
  valor: string;
  onMudar: (v: string) => void;
  enviando: boolean;
  progresso: { feitas: number; total: number } | null;
  erro: string | null;
  onVoltar: () => void;
  onEnviar: () => void;
}

export default function StepObservacao({ valor, onMudar, enviando, progresso, erro, onVoltar, onEnviar }: Props) {
  const textoBotao =
    enviando && progresso && progresso.total > 0
      ? `Enviando foto ${Math.min(progresso.feitas + 1, progresso.total)} de ${progresso.total}...`
      : enviando
        ? "Enviando..."
        : "✅ Registrar";

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
      {enviando && progresso && progresso.total > 0 && (
        <div
          style={{
            marginTop: 12,
            height: 8,
            borderRadius: 4,
            background: "#e0e0e0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round((progresso.feitas / progresso.total) * 100)}%`,
              background: "linear-gradient(135deg,#137333,#1e8e3e)",
              transition: "width .2s",
            }}
          />
        </div>
      )}
      {erro && <div className="erro-inline">{erro}</div>}
      <div className="rodape">
        <button className="btn-voltar" onClick={onVoltar} disabled={enviando}>
          ← Voltar
        </button>
        <button className="btn-enviar" onClick={onEnviar} disabled={enviando}>
          {textoBotao}
        </button>
      </div>
    </>
  );
}
