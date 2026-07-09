"use client";

import { useEffect, useState } from "react";

interface Props {
  onProsseguir: () => void;
}

const SEGUNDOS_INICIAIS = 5;

export default function ReferenciaFotoOverlay({ onProsseguir }: Props) {
  const [segundos, setSegundos] = useState(SEGUNDOS_INICIAIS);

  useEffect(() => {
    if (segundos <= 0) return;
    const timer = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [segundos]);

  return (
    <div className="dialogo-tela">
      <div className="dialogo-card" style={{ maxWidth: 420 }}>
        <div className="dialogo-titulo">Antes de explorar o solo</div>
        <div className="dialogo-mensagem">Aponte a câmera diretamente para o chão, como no exemplo abaixo.</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/referencias/antes-de-explorar-o-solo.jpg"
          alt="Exemplo: como posicionar e o resultado esperado"
          style={{ width: "100%", borderRadius: 10, marginBottom: 16 }}
        />
        <button
          type="button"
          className="btn-avancar"
          style={{ width: "100%" }}
          disabled={segundos > 0}
          onClick={onProsseguir}
        >
          {segundos > 0 ? `Aguarde ${segundos}s...` : "📷 Tirar Foto"}
        </button>
      </div>
    </div>
  );
}
