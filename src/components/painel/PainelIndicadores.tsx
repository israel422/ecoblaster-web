"use client";

import { useState } from "react";

interface RegistroLinha {
  id: number;
  data: string;
  obra: string;
  tipoCava: string;
  totalCavas: number;
  operador: string;
  fotos: unknown[];
}

interface LinhaAgregada {
  chave: string;
  registros: number;
  cavas: number;
  fotos: number;
}

function agregarPor(lista: RegistroLinha[], campo: "operador" | "tipoCava" | "obra"): LinhaAgregada[] {
  const mapa = new Map<string, LinhaAgregada>();
  for (const r of lista) {
    const chave = r[campo];
    const atual = mapa.get(chave) || { chave, registros: 0, cavas: 0, fotos: 0 };
    atual.registros += 1;
    atual.cavas += r.totalCavas;
    atual.fotos += r.fotos.length;
    mapa.set(chave, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.cavas - a.cavas);
}

const CORES_BARRA = ["#1a73e8", "#1e8e3e", "#e8710a", "#9334e6", "#d93025", "#12939a", "#e52592", "#795548"];

function GraficoBarras({ linhas }: { linhas: LinhaAgregada[] }) {
  const max = Math.max(1, ...linhas.map((l) => l.cavas));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {linhas.map((l, i) => (
        <div key={l.chave} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 140, fontSize: 12, color: "#444", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.chave}
          </div>
          <div style={{ flex: 1, background: "#f0f4f8", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(4, (l.cavas / max) * 100)}%`,
                background: CORES_BARRA[i % CORES_BARRA.length],
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 8px",
                borderRadius: 6,
                whiteSpace: "nowrap",
              }}
            >
              {l.cavas}
            </div>
          </div>
        </div>
      ))}
      {linhas.length === 0 && <p style={{ color: "#888" }}>Sem dados no período.</p>}
    </div>
  );
}

function TabelaAgregada({ titulo, colunaChave, linhas }: { titulo: string; colunaChave: string; linhas: LinhaAgregada[] }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ color: "#1B4FA2", fontSize: 17, marginBottom: 8 }}>{titulo}</h3>
      <GraficoBarras linhas={linhas} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
              <th style={{ padding: 8 }}>{colunaChave}</th>
              <th style={{ padding: 8 }}>Registros</th>
              <th style={{ padding: 8 }}>Cavas</th>
              <th style={{ padding: 8 }}>Fotos</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{l.chave}</td>
                <td style={{ padding: 8 }}>{l.registros}</td>
                <td style={{ padding: 8 }}>{l.cavas}</td>
                <td style={{ padding: 8 }}>{l.fotos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PainelIndicadores({ cpfAdmin, onVoltar }: { cpfAdmin: string; onVoltar?: () => void }) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [lista, setLista] = useState<RegistroLinha[] | null>(null);

  async function buscar() {
    setCarregando(true);
    const params = new URLSearchParams({ cpf: cpfAdmin });
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    const resp = await fetch(`/api/registros?${params.toString()}`);
    const json = resp.ok ? await resp.json() : [];
    setLista(Array.isArray(json) ? json : []);
    setCarregando(false);
  }

  const totalRegistros = lista?.length ?? 0;
  const totalCavas = lista?.reduce((soma, r) => soma + r.totalCavas, 0) ?? 0;
  const totalFotos = lista?.reduce((soma, r) => soma + r.fotos.length, 0) ?? 0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ color: "#1B4FA2", fontSize: 26 }}>Painel de Indicadores</h1>
        {onVoltar && (
          <button className="btn-voltar" style={{ padding: "10px 16px" }} onClick={onVoltar}>
            ← Menu
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <label style={{ fontSize: 13, color: "#666" }}>
          De
          <br />
          <input
            className="campo-grande"
            style={{ width: 160, padding: 12, marginTop: 4 }}
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </label>
        <label style={{ fontSize: 13, color: "#666" }}>
          Até
          <br />
          <input
            className="campo-grande"
            style={{ width: 160, padding: 12, marginTop: 4 }}
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </label>
        <button className="btn-avancar" style={{ flex: "0 0 auto", padding: "12px 20px", alignSelf: "flex-end" }} onClick={buscar}>
          Buscar
        </button>
      </div>

      {carregando && <p>Carregando...</p>}

      {lista && !carregando && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <div className="operador-card" style={{ flex: "1 1 140px" }}>
              <div className="operador-nome">{totalRegistros}</div>
              <div className="operador-label">Registros</div>
            </div>
            <div className="operador-card" style={{ flex: "1 1 140px" }}>
              <div className="operador-nome">{totalCavas}</div>
              <div className="operador-label">Cavas</div>
            </div>
            <div className="operador-card" style={{ flex: "1 1 140px" }}>
              <div className="operador-nome">{totalFotos}</div>
              <div className="operador-label">Fotos</div>
            </div>
          </div>

          <TabelaAgregada titulo="Por Operador" colunaChave="Operador" linhas={agregarPor(lista, "operador")} />
          <TabelaAgregada titulo="Por Tipo de Cava" colunaChave="Tipo de Cava" linhas={agregarPor(lista, "tipoCava")} />
          <TabelaAgregada titulo="Por Obra" colunaChave="Obra" linhas={agregarPor(lista, "obra")} />
        </>
      )}

      {!lista && !carregando && (
        <p style={{ color: "#888" }}>Escolha um período (ou deixe em branco pra ver tudo) e toque em Buscar.</p>
      )}
    </div>
  );
}
