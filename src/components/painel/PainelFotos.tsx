"use client";

import { useEffect, useState } from "react";
import { TIPOS_CAVA } from "@/lib/config/tiposCava";

interface FotoRegistro {
  cava: number;
  fotoNum: number;
  label: string;
  url: string;
}

interface RegistroLinha {
  id: number;
  criadoEm: string;
  data: string;
  obra: string;
  tipoCava: string;
  totalCavas: number;
  operador: string;
  cpf: string;
  observacao: string | null;
  fotos: FotoRegistro[];
}

interface Filtros {
  obra: string;
  operador: string;
  tipoCava: string;
  dataInicio: string;
  dataFim: string;
}

const FILTROS_VAZIOS: Filtros = { obra: "", operador: "", tipoCava: "", dataInicio: "", dataFim: "" };

export default function PainelFotos({ cpfAdmin, onVoltar }: { cpfAdmin: string; onVoltar?: () => void }) {
  const [registrosLista, setRegistrosLista] = useState<RegistroLinha[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [registroAberto, setRegistroAberto] = useState<RegistroLinha | null>(null);

  async function carregar(f: Filtros) {
    setCarregando(true);
    const params = new URLSearchParams({ cpf: cpfAdmin });
    Object.entries(f).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const resp = await fetch(`/api/registros?${params.toString()}`);
    if (resp.ok) {
      const json = await resp.json();
      setRegistrosLista(Array.isArray(json) ? json : []);
    } else {
      setRegistrosLista([]);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar(FILTROS_VAZIOS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpfAdmin]);

  async function baixarFoto(url: string, nomeArquivo: string) {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  async function baixarTodasFotos(registro: RegistroLinha) {
    for (const f of registro.fotos) {
      const nome = `obra${registro.obra}_cava${f.cava}_${f.label.replace(/[^a-zA-Z0-9]+/g, "_")}.jpg`;
      await baixarFoto(f.url, nome);
    }
  }

  function exportarCSV() {
    const linhas = [
      ["Data", "Obra", "Tipo de Cava", "Total de Cavas", "Operador", "CPF", "Observacao", "Fotos"].join(";"),
      ...registrosLista.map((r) =>
        [
          r.data.slice(0, 10).split("-").reverse().join("/"),
          r.obra,
          r.tipoCava,
          r.totalCavas,
          r.operador,
          r.cpf,
          (r.observacao || "").replace(/;/g, ","),
          r.fotos.length,
        ].join(";")
      ),
    ].join("\n");
    const blob = new Blob(["﻿" + linhas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros_ecoblaster_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ color: "#1B4FA2", fontSize: 26 }}>Painel de Fotos</h1>
        {onVoltar && (
          <button className="btn-voltar" style={{ padding: "10px 16px" }} onClick={onVoltar}>
            ← Menu
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input
          className="campo-grande"
          style={{ width: 130, padding: 12 }}
          placeholder="Obra"
          value={filtros.obra}
          onChange={(e) => setFiltros((f) => ({ ...f, obra: e.target.value }))}
        />
        <input
          className="campo-grande"
          style={{ width: 200, padding: 12 }}
          placeholder="Operador"
          value={filtros.operador}
          onChange={(e) => setFiltros((f) => ({ ...f, operador: e.target.value }))}
        />
        <select
          className="campo-grande"
          style={{ width: 180, padding: 12 }}
          value={filtros.tipoCava}
          onChange={(e) => setFiltros((f) => ({ ...f, tipoCava: e.target.value }))}
        >
          <option value="">Todos os tipos</option>
          {TIPOS_CAVA.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id}
            </option>
          ))}
        </select>
        <input
          className="campo-grande"
          style={{ width: 150, padding: 12 }}
          type="date"
          value={filtros.dataInicio}
          onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))}
        />
        <input
          className="campo-grande"
          style={{ width: 150, padding: 12 }}
          type="date"
          value={filtros.dataFim}
          onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))}
        />
        <button className="btn-avancar" style={{ flex: "0 0 auto", padding: "12px 20px" }} onClick={() => carregar(filtros)}>
          Filtrar
        </button>
        <button
          className="btn-voltar"
          style={{ padding: "12px 20px" }}
          onClick={() => {
            setFiltros(FILTROS_VAZIOS);
            carregar(FILTROS_VAZIOS);
          }}
        >
          Limpar
        </button>
        <button className="btn-voltar" style={{ padding: "12px 20px" }} onClick={exportarCSV}>
          ⬇️ Exportar CSV
        </button>
      </div>

      {carregando && <p>Carregando...</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
              <th style={{ padding: 8 }}>Data</th>
              <th style={{ padding: 8 }}>Obra</th>
              <th style={{ padding: 8 }}>Tipo</th>
              <th style={{ padding: 8 }}>Cavas</th>
              <th style={{ padding: 8 }}>Operador</th>
              <th style={{ padding: 8 }}>Fotos</th>
            </tr>
          </thead>
          <tbody>
            {registrosLista.map((r) => (
              <tr
                key={r.id}
                style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                onClick={() => setRegistroAberto(r)}
              >
                <td style={{ padding: 8 }}>{r.data.slice(0, 10).split("-").reverse().join("/")}</td>
                <td style={{ padding: 8 }}>{r.obra}</td>
                <td style={{ padding: 8 }}>{r.tipoCava}</td>
                <td style={{ padding: 8 }}>{r.totalCavas}</td>
                <td style={{ padding: 8 }}>{r.operador}</td>
                <td style={{ padding: 8 }}>{r.fotos.length} 📷</td>
              </tr>
            ))}
          </tbody>
        </table>
        {registrosLista.length === 0 && !carregando && (
          <p style={{ color: "#888", marginTop: 20 }}>Nenhum registro encontrado.</p>
        )}
      </div>

      {registroAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 400,
            display: "flex",
            flexDirection: "column",
            padding: 20,
            overflowY: "auto",
          }}
          onClick={() => setRegistroAberto(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: 20, maxWidth: 700, margin: "20px auto", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <h3 style={{ color: "#1B4FA2" }}>
                Obra {registroAberto.obra} — {registroAberto.tipoCava} — {registroAberto.operador}
              </h3>
              <button
                className="btn-voltar"
                style={{ flex: "0 0 auto", padding: "10px 16px", whiteSpace: "nowrap" }}
                onClick={() => baixarTodasFotos(registroAberto)}
              >
                ⬇️ Baixar todas
              </button>
            </div>
            {registroAberto.observacao && <p style={{ color: "#666" }}>Obs: {registroAberto.observacao}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 10, marginTop: 12 }}>
              {registroAberto.fotos.map((f, i) => (
                <div key={i}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.label} style={{ width: "100%", borderRadius: 8, objectFit: "cover", aspectRatio: "1" }} />
                  </a>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                    Cava {f.cava}: {f.label}
                  </div>
                  <button
                    className="btn-voltar"
                    style={{ marginTop: 4, padding: "6px 10px", fontSize: 12, width: "100%" }}
                    onClick={() =>
                      baixarFoto(f.url, `obra${registroAberto.obra}_cava${f.cava}_${f.label.replace(/[^a-zA-Z0-9]+/g, "_")}.jpg`)
                    }
                  >
                    ⬇️ Baixar
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-voltar" style={{ marginTop: 16 }} onClick={() => setRegistroAberto(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
