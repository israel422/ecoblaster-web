"use client";

interface Props {
  nome: string;
  onNovoRegistro: () => void;
  onPainelFotos: () => void;
  onPainelIndicadores: () => void;
}

export default function AdminMenu({ nome, onNovoRegistro, onPainelFotos, onPainelIndicadores }: Props) {
  return (
    <div className="turnos-tela">
      <div className="turnos-card">
        <div className="turnos-titulo">Olá, {nome}</div>
        <div className="turnos-sub">O que você quer fazer?</div>

        <button type="button" className="btn-avancar" style={{ width: "100%", marginBottom: 14 }} onClick={onNovoRegistro}>
          📝 Novo Registro
        </button>
        <button type="button" className="btn-avancar" style={{ width: "100%", marginBottom: 14 }} onClick={onPainelFotos}>
          📷 Painel de Fotos
        </button>
        <button type="button" className="btn-avancar" style={{ width: "100%" }} onClick={onPainelIndicadores}>
          📊 Painel de Indicadores
        </button>
      </div>
    </div>
  );
}
