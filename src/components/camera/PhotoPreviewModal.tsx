"use client";

import { useEffect, useState } from "react";

interface Props {
  blob: Blob;
  onConfirmar: () => void;
  onTirarNovamente: () => void;
}

export default function PhotoPreviewModal({ blob, onConfirmar, onTirarNovamente }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

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
        gap: 20,
      }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Prévia da foto"
          style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
        />
      )}
      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 420 }}>
        <button
          type="button"
          onClick={onTirarNovamente}
          style={{
            flex: 1,
            padding: 18,
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            border: "2px solid #dfe7e3",
            background: "#fff",
            color: "#5d6f6c",
          }}
        >
          🔁 Tirar novamente
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          style={{
            flex: 1,
            padding: 18,
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: "linear-gradient(135deg,#1f7a4a,#2f9e4b)",
            color: "#fff",
          }}
        >
          ✅ Confirmar
        </button>
      </div>
    </div>
  );
}
