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
  const [lote, setLote] = useState("");
  const [resultadoLote, setResultadoLote] = useState<string | null>(null);

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

  async function adicionarLote() {
    const codigos = lote
      .split(/[\s,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (codigos.length === 0) return;
    setSalvando(true);
    setErro(null);
    setResultadoLote(null);
    try {
      const resp = await fetch("/api/obras/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigos, cpf: cpfAdmin }),
      });
      const json = await resp.json().catch(() => ({}) as { erro?: string; adicionadas?: number; ignoradas?: number });
      if (!resp.ok) {
        setErro(json.erro || "Erro ao adicionar a lista.");
        return;
      }
      setResultadoLote(`${json.adicionadas} obra(s) adicionada(s), ${json.ignoradas} já existiam.`);
      setLote("");
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

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #e8ecf0" }}>
        <div className="passo-sub" style={{ marginBottom: 8 }}>
          Ou cole a lista de todas as obras do mês (uma por linha, ou separadas por vírgula/espaço):
        </div>
        <textarea
          className="campo-grande"
          style={{ width: "100%", minHeight: 100, resize: "vertical" }}
          placeholder={"467379\n463880\n462369\n..."}
          value={lote}
          onChange={(e) => setLote(e.target.value)}
        />
        <button
          className="btn-avancar"
          style={{ marginTop: 8 }}
          disabled={salvando || !lote.trim()}
          onClick={adicionarLote}
        >
          + Adicionar lista
        </button>
        {resultadoLote && <div style={{ marginTop: 8, color: "#1e8e3e", fontSize: 13 }}>{resultadoLote}</div>}
      </div>

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
