"use client";

import { useEffect, useState } from "react";

interface Props {
  file: File;
  onTirarNovamente: () => void;
}

export default function FotoRejeitadaModal({ file, onTirarNovamente }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        gap: 16,
      }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Foto recusada"
          style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
        />
      )}
      <div style={{ background: "#fff", borderRadius: 14, padding: 18, maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#c5221f", marginBottom: 6 }}>Foto não parece o solo</div>
        <div style={{ fontSize: 14, color: "#444", lineHeight: 1.5 }}>
          Essa foto não parece um close do chão antes de escavar. Aponte a câmera diretamente para o solo e tire de
          novo.
        </div>
      </div>
      <button
        type="button"
        onClick={onTirarNovamente}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 18,
          borderRadius: 14,
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          border: "none",
          background: "linear-gradient(135deg,#1557b0,#1a73e8)",
          color: "#fff",
        }}
      >
        📷 Tirar novamente
      </button>
    </div>
  );
}
