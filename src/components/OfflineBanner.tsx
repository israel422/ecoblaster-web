"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#EA4335",
        color: "#fff",
        textAlign: "center",
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 700,
        zIndex: 500,
      }}
    >
      🔴 Sem conexão com a internet — as fotos continuam sendo salvas, sincronize quando a internet voltar
    </div>
  );
}
