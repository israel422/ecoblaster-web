interface Props {
  titulo?: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ConfirmModal({
  titulo = "Confirmar",
  mensagem,
  textoConfirmar = "Sim, apagar",
  textoCancelar = "Cancelar",
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <div className="dialogo-tela" onClick={onCancelar}>
      <div className="dialogo-card" onClick={(e) => e.stopPropagation()}>
        <div className="dialogo-titulo">{titulo}</div>
        <div className="dialogo-mensagem">{mensagem}</div>
        <div className="dialogo-botoes">
          <button type="button" className="turno-btn-secundario" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button type="button" className="turno-btn-descartar-texto" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
