"use client";

import { useEffect, useState } from "react";
import { TIPOS_CAVA } from "@/lib/config/tiposCava";
import { OPERADORES } from "@/lib/config/operadores";
import { MOTIVOS_JUSTIFICATIVA } from "@/lib/config/motivosJustificativa";

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
          <div style={{ width: 180, fontSize: 12, color: "#444", textAlign: "right", flexShrink: 0 }}>
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

interface ObraPorTipo {
  obra: string;
  totalCavas: number;
  porTipo: Record<string, number>;
}

function agregarObraPorTipo(lista: RegistroLinha[]): ObraPorTipo[] {
  const mapa = new Map<string, ObraPorTipo>();
  for (const r of lista) {
    const atual = mapa.get(r.obra) || { obra: r.obra, totalCavas: 0, porTipo: {} };
    atual.totalCavas += r.totalCavas;
    atual.porTipo[r.tipoCava] = (atual.porTipo[r.tipoCava] || 0) + r.totalCavas;
    mapa.set(r.obra, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.totalCavas - a.totalCavas);
}

interface MediaCavas {
  chave: string;
  totalCavas: number;
  dias: number;
  mediaPorDia: number;
}

function agregarMediaCavaPor(lista: RegistroLinha[], campo: "obra" | "operador"): MediaCavas[] {
  const mapa = new Map<string, { totalCavas: number; dias: Set<string> }>();
  for (const r of lista) {
    const chave = r[campo];
    const atual = mapa.get(chave) || { totalCavas: 0, dias: new Set<string>() };
    atual.totalCavas += r.totalCavas;
    atual.dias.add(r.data);
    mapa.set(chave, atual);
  }
  return Array.from(mapa.entries())
    .map(([chave, v]) => ({
      chave,
      totalCavas: v.totalCavas,
      dias: v.dias.size,
      mediaPorDia: v.dias.size > 0 ? v.totalCavas / v.dias.size : 0,
    }))
    .sort((a, b) => b.mediaPorDia - a.mediaPorDia);
}

function TabelaMediaCavas({ titulo, colunaChave, descricao, linhas }: { titulo: string; colunaChave: string; descricao: string; linhas: MediaCavas[] }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ color: "#1B4FA2", fontSize: 17, marginBottom: 8 }}>{titulo}</h3>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>{descricao}</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
              <th style={{ padding: 8 }}>{colunaChave}</th>
              <th style={{ padding: 8 }}>Cavas</th>
              <th style={{ padding: 8 }}>Dias trabalhados</th>
              <th style={{ padding: 8 }}>Média de cavas/dia</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{l.chave}</td>
                <td style={{ padding: 8 }}>{l.totalCavas}</td>
                <td style={{ padding: 8 }}>{l.dias}</td>
                <td style={{ padding: 8, fontWeight: 700 }}>{l.mediaPorDia.toFixed(1)}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td style={{ padding: 8 }} colSpan={4}>
                  Sem dados no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CORES_TIPO: Record<string, string> = {
  "Cava Normal": "#1a73e8",
  "Cava em Rocha": "#e8710a",
  Blaster: "#d93025",
  Rompedor: "#795548",
  "Cava Iniciada": "#9334e6",
  "Cava Furada": "#12939a",
  "Limpeza de Cava": "#1e8e3e",
};

function GraficoBarrasEmpilhadasPorTipo({ linhas }: { linhas: ObraPorTipo[] }) {
  const max = Math.max(1, ...linhas.map((l) => l.totalCavas));
  const tiposPresentes = TIPOS_CAVA.map((t) => t.id).filter((id) => linhas.some((l) => l.porTipo[id]));

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, fontSize: 12, color: "#444" }}>
        {tiposPresentes.map((tipo) => (
          <span key={tipo} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: CORES_TIPO[tipo] ?? "#999", display: "inline-block" }} />
            {tipo}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {linhas.map((l) => (
          <div key={l.obra} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 140, fontSize: 12, color: "#444", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.obra}
            </div>
            <div style={{ flex: 1, display: "flex", background: "#f0f4f8", borderRadius: 6, overflow: "hidden" }}>
              {tiposPresentes.map((tipo) => {
                const valor = l.porTipo[tipo] || 0;
                if (!valor) return null;
                return (
                  <div
                    key={tipo}
                    title={`${tipo}: ${valor}`}
                    style={{
                      width: `${(valor / max) * 100}%`,
                      background: CORES_TIPO[tipo] ?? "#999",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "6px 4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {valor}
                  </div>
                );
              })}
            </div>
            <div style={{ width: 32, fontSize: 12, color: "#666", flexShrink: 0 }}>{l.totalCavas}</div>
          </div>
        ))}
      </div>
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

const OPERADORES_CAMPO = OPERADORES.filter((o) => !o.admin).sort((a, b) => a.nome.localeCompare(b.nome));

function diasNoIntervalo(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  let atual = new Date(`${inicio}T00:00:00Z`);
  const limite = new Date(`${fim}T00:00:00Z`);
  while (atual <= limite) {
    dias.push(atual.toISOString().slice(0, 10));
    atual = new Date(atual.getTime() + 86400000);
  }
  return dias;
}

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

interface Justificativa {
  cpf: string;
  operador: string;
  data: string;
  motivo: string;
}

function chaveJust(cpf: string, data: string) {
  return `${cpf}|${data}`;
}

function TabelaFrequencia({
  lista,
  dataInicio,
  dataFim,
  cpfAdmin,
}: {
  lista: RegistroLinha[];
  dataInicio: string;
  dataFim: string;
  cpfAdmin: string;
}) {
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [carregandoJust, setCarregandoJust] = useState(false);

  useEffect(() => {
    if (!dataInicio || !dataFim) return;
    let cancelado = false;

    async function carregar() {
      setCarregandoJust(true);
      const params = new URLSearchParams({ cpf: cpfAdmin, dataInicio, dataFim });
      const resp = await fetch(`/api/justificativas?${params.toString()}`);
      const lista: Justificativa[] = resp.ok ? await resp.json() : [];
      if (cancelado) return;
      const mapa: Record<string, string> = {};
      for (const j of lista) mapa[chaveJust(j.cpf, j.data)] = j.motivo;
      setJustificativas(mapa);
      setCarregandoJust(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim, cpfAdmin]);

  async function salvarJustificativa(operadorCpf: string, data: string, motivo: string) {
    setJustificativas((atual) => ({ ...atual, [chaveJust(operadorCpf, data)]: motivo }));
    await fetch("/api/justificativas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfAdmin, operadorCpf, data, motivo }),
    });
  }

  if (!dataInicio || !dataFim) {
    return <p style={{ color: "#888" }}>Escolha as datas &quot;De&quot; e &quot;Até&quot; acima e toque em Buscar pra ver esse relatório.</p>;
  }

  const dias = diasNoIntervalo(dataInicio, dataFim);

  const porDia = new Map<string, Set<string>>();
  for (const dia of dias) porDia.set(dia, new Set());
  for (const r of lista) {
    if (porDia.has(r.data)) porDia.get(r.data)!.add(r.operador);
  }

  const resumoPorOperador = OPERADORES_CAMPO.map((op) => {
    const diasSemLancar = dias.filter((dia) => !porDia.get(dia)?.has(op.nome));
    const semJustificativa = diasSemLancar.filter((dia) => !justificativas[chaveJust(op.cpf, dia)]);
    return {
      operador: op.nome,
      diasSemLancar: diasSemLancar.length,
      semJustificativa: semJustificativa.length,
      totalDias: dias.length,
    };
  }).sort((a, b) => b.semJustificativa - a.semJustificativa);

  const totalDiasSemLancar = resumoPorOperador.reduce((soma, o) => soma + o.diasSemLancar, 0);
  const totalSemJustificativa = resumoPorOperador.reduce((soma, o) => soma + o.semJustificativa, 0);
  const totalJustificado = totalDiasSemLancar - totalSemJustificativa;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div className="operador-card" style={{ flex: "1 1 140px" }}>
          <div className="operador-nome">{totalDiasSemLancar}</div>
          <div className="operador-label">Dias sem lançamento (soma)</div>
        </div>
        <div className="operador-card" style={{ flex: "1 1 140px" }}>
          <div className="operador-nome" style={{ color: "#d93025" }}>
            {totalSemJustificativa}
          </div>
          <div className="operador-label">Sem justificativa</div>
        </div>
        <div className="operador-card" style={{ flex: "1 1 140px" }}>
          <div className="operador-nome" style={{ color: "#1e8e3e" }}>
            {totalJustificado}
          </div>
          <div className="operador-label">Justificados</div>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: "#1B4FA2", fontSize: 17, marginBottom: 8 }}>Resumo — dias sem lançamento</h3>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
          De {dias.length} dia(s) no período, quantos cada operador ficou sem lançar nenhum registro — e quantos
          desses ainda não têm justificativa.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ padding: 8 }}>Operador</th>
                <th style={{ padding: 8 }}>Dias sem lançar</th>
                <th style={{ padding: 8 }}>Sem justificativa</th>
                <th style={{ padding: 8 }}>Dias com lançamento</th>
              </tr>
            </thead>
            <tbody>
              {resumoPorOperador.map((o) => (
                <tr key={o.operador} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{o.operador}</td>
                  <td style={{ padding: 8 }}>{o.diasSemLancar}</td>
                  <td style={{ padding: 8, fontWeight: 700, color: o.semJustificativa > 0 ? "#d93025" : "#1e8e3e" }}>
                    {o.semJustificativa}
                  </td>
                  <td style={{ padding: 8 }}>{o.totalDias - o.diasSemLancar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: "#1B4FA2", fontSize: 17, marginBottom: 8 }}>Dia a dia</h3>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
          ✓ lançou pelo menos um registro naquele dia. Nos dias sem lançamento, escolha um motivo padrão pra
          justificar. {carregandoJust && "Carregando justificativas..."}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ padding: 8 }}>Data</th>
                {OPERADORES_CAMPO.map((op) => (
                  <th key={op.cpf} style={{ padding: 8, fontSize: 11, whiteSpace: "nowrap" }}>
                    {op.nome.split(" ").slice(0, 2).join(" ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dias.map((dia) => (
                <tr key={dia} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>{formatarDataCurta(dia)}</td>
                  {OPERADORES_CAMPO.map((op) => {
                    const lancou = porDia.get(dia)?.has(op.nome);
                    if (lancou) {
                      return (
                        <td key={op.cpf} style={{ padding: 8, textAlign: "center", color: "#1e8e3e", fontWeight: 700 }}>
                          ✓
                        </td>
                      );
                    }
                    const motivoAtual = justificativas[chaveJust(op.cpf, dia)] ?? "";
                    return (
                      <td key={op.cpf} style={{ padding: 4, textAlign: "center" }}>
                        <select
                          value={motivoAtual}
                          onChange={(e) => salvarJustificativa(op.cpf, dia, e.target.value)}
                          style={{
                            fontSize: 11,
                            padding: "4px 2px",
                            borderRadius: 4,
                            border: "1px solid #ddd",
                            color: motivoAtual ? "#1B4FA2" : "#d93025",
                            fontWeight: 700,
                            maxWidth: 110,
                          }}
                        >
                          <option value="">— (sem motivo)</option>
                          {MOTIVOS_JUSTIFICATIVA.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PainelIndicadores({ cpfAdmin, onVoltar }: { cpfAdmin: string; onVoltar?: () => void }) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [lista, setLista] = useState<RegistroLinha[] | null>(null);
  const [aba, setAba] = useState<"indicadores" | "frequencia">("indicadores");

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

      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e0e0e0" }}>
        <button
          onClick={() => setAba("indicadores")}
          style={{
            padding: "10px 16px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            color: aba === "indicadores" ? "#1B4FA2" : "#888",
            borderBottom: aba === "indicadores" ? "3px solid #1B4FA2" : "3px solid transparent",
          }}
        >
          Indicadores
        </button>
        <button
          onClick={() => setAba("frequencia")}
          style={{
            padding: "10px 16px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            color: aba === "frequencia" ? "#1B4FA2" : "#888",
            borderBottom: aba === "frequencia" ? "3px solid #1B4FA2" : "3px solid transparent",
          }}
        >
          Frequência
        </button>
      </div>

      {carregando && <p>Carregando...</p>}

      {lista && !carregando && aba === "frequencia" && (
        <TabelaFrequencia lista={lista} dataInicio={dataInicio} dataFim={dataFim} cpfAdmin={cpfAdmin} />
      )}

      {lista && !carregando && aba === "indicadores" && (
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

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ color: "#1B4FA2", fontSize: 17, marginBottom: 8 }}>Por Obra</h3>
            <GraficoBarrasEmpilhadasPorTipo linhas={agregarObraPorTipo(lista)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
                    <th style={{ padding: 8 }}>Obra</th>
                    <th style={{ padding: 8 }}>Registros</th>
                    <th style={{ padding: 8 }}>Cavas</th>
                    <th style={{ padding: 8 }}>Fotos</th>
                  </tr>
                </thead>
                <tbody>
                  {agregarPor(lista, "obra").map((l) => (
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

          <TabelaMediaCavas
            titulo="Média de Cavas por Obra"
            colunaChave="Obra"
            descricao="Total de cavas dividido pelos dias com registro em cada obra, no período selecionado."
            linhas={agregarMediaCavaPor(lista, "obra")}
          />

          <TabelaMediaCavas
            titulo="Média de Cavas por Operador"
            colunaChave="Operador"
            descricao="Total de cavas dividido pelos dias com registro de cada operador, no período selecionado."
            linhas={agregarMediaCavaPor(lista, "operador")}
          />
        </>
      )}

      {!lista && !carregando && (
        <p style={{ color: "#888" }}>Escolha um período (ou deixe em branco pra ver tudo) e toque em Buscar.</p>
      )}
    </div>
  );
}
