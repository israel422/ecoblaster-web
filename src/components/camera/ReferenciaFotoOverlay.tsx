"use client";

import { useEffect, useState } from "react";
import type { ReferenciaFoto } from "@/lib/config/referenciasFoto";

interface Props {
  referencia: ReferenciaFoto;
  onProsseguir: () => void;
  onEscolherGaleria: () => void;
}

const SEGUNDOS_INICIAIS = 5;

export default function ReferenciaFotoOverlay({ referencia, onProsseguir, onEscolherGaleria }: Props) {
  const [segundos, setSegundos] = useState(SEGUNDOS_INICIAIS);

  useEffect(() => {
    if (segundos <= 0) return;
    const timer = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [segundos]);

  return (
    <div className="dialogo-tela">
      <div className="dialogo-card" style={{ maxWidth: 420 }}>
        <div className="dialogo-titulo">{referencia.titulo}</div>
        <div className="dialogo-mensagem">{referencia.instrucao}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={referencia.imagem}
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
        <button
          type="button"
          onClick={onEscolherGaleria}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 10,
            border: "none",
            background: "none",
            color: "#5f6368",
            fontSize: 14,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          🖼️ Escolher da galeria
        </button>
      </div>
    </div>
  );
}
