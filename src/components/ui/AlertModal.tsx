interface Props {
  titulo?: string;
  mensagem: string;
  textoFechar?: string;
  onFechar: () => void;
}

export default function AlertModal({ titulo = "Aviso", mensagem, textoFechar = "Entendi", onFechar }: Props) {
  return (
    <div className="dialogo-tela" onClick={onFechar}>
      <div className="dialogo-card" onClick={(e) => e.stopPropagation()}>
        <div className="dialogo-titulo">{titulo}</div>
        <div className="dialogo-mensagem">{mensagem}</div>
        <div className="dialogo-botoes">
          <button type="button" className="turno-btn-primario" onClick={onFechar} style={{ flex: 1 }}>
            {textoFechar}
          </button>
        </div>
      </div>
    </div>
  );
}
