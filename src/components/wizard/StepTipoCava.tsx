import { TIPOS_CAVA, tiposPermitidos } from "@/lib/config/tiposCava";
import type { Categoria } from "@/lib/config/operadores";

interface Props {
  categoria: Categoria | null;
  valor: string;
  onSelecionar: (tipo: string) => void;
  erro: boolean;
  onVoltar: () => void;
  onAvancar: () => void;
}

export default function StepTipoCava({ categoria, valor, onSelecionar, erro, onVoltar, onAvancar }: Props) {
  const permitidos = tiposPermitidos(categoria);
  const opcoes = TIPOS_CAVA.filter((t) => permitidos.includes(t.id));

  return (
    <>
      <div className="passo-titulo">Tipo de Cava</div>
      <div className="passo-sub">Selecione o tipo executado</div>
      <div className="tipo-grid">
        {opcoes.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tipo-btn${valor === t.id ? " ativo" : ""}`}
            onClick={() => onSelecionar(t.id)}
          >
            {t.emoji}
            <br />
            {t.id}
          </button>
        ))}
      </div>
      {erro && <div className="erro-inline">Selecione o tipo de cava.</div>}
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
