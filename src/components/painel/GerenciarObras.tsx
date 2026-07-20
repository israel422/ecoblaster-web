"use client";

import { useEffect, useState } from "react";
import { OBRAS } from "@/lib/config/obras";
import { atualizarObrasExtraCache } from "@/lib/obras/obrasExtra";

interface Props {
  cpfAdmin: string;
  onVoltar?: () => void;
}

export default function GerenciarObras({ cpfAdmin, onVoltar }: Props) {
  const [lista, setLista] = useState<string[] | null>(null);
  const [codigo, setCodigo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const lista = await atualizarObrasExtraCache();
    setLista(lista);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar() {
    const valor = codigo.trim();
    if (!valor) return;
    setSalvando(true);
    setErro(null);
    try {
      const resp = await fetch("/api/obras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: valor, cpf: cpfAdmin }),
      });
      const json = await resp.json().catch(() => ({}) as { erro?: string });
      if (!resp.ok) {
        setErro(json.erro || "Erro ao adicionar obra.");
        return;
      }
      setCodigo("");
      await carregar();
    } catch {
      setErro("Sem conexão. Tente de novo quando tiver internet.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(alvo: string) {
    setSalvando(true);
    try {
      await fetch(`/api/obras/${encodeURIComponent(alvo)}?cpf=${encodeURIComponent(cpfAdmin)}`, {
        method: "DELETE",
      });
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ color: "#1B4FA2", fontSize: 26 }}>Obras</h1>
        {onVoltar && (
          <button className="btn-voltar" style={{ padding: "10px 16px" }} onClick={onVoltar}>
            ← Menu
          </button>
        )}
      </div>

      <div className="passo-sub" style={{ marginBottom: 12 }}>
        {OBRAS.length} obra(s) já vêm no aplicativo. Adicione aqui as novas que ainda não estão na lista.
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
        <input
          className="campo-grande"
          style={{ flex: 1 }}
          placeholder="Número da nova obra..."
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") adicionar();
          }}
        />
        <button className="btn-avancar" disabled={salvando || !codigo.trim()} onClick={adicionar}>
          + Adicionar
        </button>
      </div>
      {erro && <div className="erro-inline">{erro}</div>}

      <div style={{ marginTop: 20 }}>
        {lista === null && <div style={{ color: "#888" }}>Carregando...</div>}
        {lista !== null && lista.length === 0 && (
          <div style={{ color: "#888" }}>Nenhuma obra adicionada por aqui ainda.</div>
        )}
        {lista?.map((o) => (
          <div
            key={o}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid #e8ecf0",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600 }}>{o}</span>
            <button type="button" className="foto-del" disabled={salvando} onClick={() => remover(o)}>
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
