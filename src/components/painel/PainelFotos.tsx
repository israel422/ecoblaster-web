"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { TIPOS_CAVA } from "@/lib/config/tiposCava";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface FotoRegistroBruta {
  cava: number;
  fotoNum: number;
  label: string;
  url: string;
}

interface FotoRegistro extends FotoRegistroBruta {
  /** Id do registro (1 por cava) dono dessa foto — usado pra corrigir o tipo de uma cava específica. */
  registroId: number;
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
  fotos: FotoRegistroBruta[];
  turnoId: string | null;
}

// Desde que cada cava vira um registro próprio no banco (ver sincronizarTurno
// e registrarCava), várias linhas podem pertencer ao mesmo turno (mesmo
// turnoId). Aqui agrupamos só pra exibição — apagar/baixar afeta todas as
// cavas do grupo. Registros sem turnoId (ex: dados antigos, ou turno cujo
// registro-aberto no servidor falhou) aparecem sozinhos.
interface GrupoRegistro {
  chave: string;
  ids: number[];
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

function agruparRegistros(lista: RegistroLinha[]): GrupoRegistro[] {
  const grupos = new Map<string, GrupoRegistro>();
  for (const r of lista) {
    // Só junta na mesma linha se for o mesmo turno E o mesmo tipo de cava —
    // se o operador mudou de tipo (ex: Cava em Rocha → Cava Normal) no meio
    // do dia, cada tipo aparece em linha separada, mesmo que compartilhem turnoId.
    const chave = `${r.turnoId ?? `solo-${r.id}`}::${r.tipoCava}`;
    const fotosComRegistroId = r.fotos.map((f) => ({ ...f, registroId: r.id }));
    const atual = grupos.get(chave);
    if (!atual) {
      grupos.set(chave, {
        chave,
        ids: [r.id],
        criadoEm: r.criadoEm,
        data: r.data,
        obra: r.obra,
        tipoCava: r.tipoCava,
        totalCavas: r.totalCavas,
        operador: r.operador,
        cpf: r.cpf,
        observacao: r.observacao,
        fotos: fotosComRegistroId,
      });
    } else {
      atual.ids.push(r.id);
      atual.totalCavas += r.totalCavas;
      atual.fotos.push(...fotosComRegistroId);
      if (!atual.observacao && r.observacao) atual.observacao = r.observacao;
      if (r.criadoEm > atual.criadoEm) atual.criadoEm = r.criadoEm;
    }
  }
  const resultado = Array.from(grupos.values());
  for (const g of resultado) g.fotos.sort((a, b) => a.cava - b.cava || a.fotoNum - b.fotoNum);
  resultado.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  return resultado;
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
  const [registroAberto, setRegistroAberto] = useState<GrupoRegistro | null>(null);
  const [fotoAbertaIdx, setFotoAbertaIdx] = useState<number | null>(null);
  const [registroParaApagar, setRegistroParaApagar] = useState<GrupoRegistro | null>(null);
  const [apagando, setApagando] = useState(false);
  const [cavaParaCorrigir, setCavaParaCorrigir] = useState<{ cava: number; registroId: number; tipoAtual: string } | null>(
    null
  );
  const [novoTipo, setNovoTipo] = useState("");
  const [corrigindo, setCorrigindo] = useState(false);

  const agrupados = useMemo(() => agruparRegistros(registrosLista), [registrosLista]);

  useEffect(() => {
    if (fotoAbertaIdx === null || !registroAberto) return;
    const total = registroAberto.fotos.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFotoAbertaIdx(null);
      if (e.key === "ArrowLeft") setFotoAbertaIdx((i) => (i === null ? i : (i - 1 + total) % total));
      if (e.key === "ArrowRight") setFotoAbertaIdx((i) => (i === null ? i : (i + 1) % total));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fotoAbertaIdx, registroAberto]);

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

  async function baixarTodasFotos(registro: GrupoRegistro) {
    for (const f of registro.fotos) {
      const nome = `obra${registro.obra}_cava${f.cava}_${f.label.replace(/[^a-zA-Z0-9]+/g, "_")}.jpg`;
      await baixarFoto(f.url, nome);
    }
  }

  async function apagarRegistroConfirmado() {
    if (!registroParaApagar) return;
    setApagando(true);
    const idsParaApagar = registroParaApagar.ids;
    const resultados = await Promise.all(
      idsParaApagar.map((id) => fetch(`/api/registros/${id}?cpf=${cpfAdmin}`, { method: "DELETE" }))
    );
    if (resultados.every((r) => r.ok)) {
      const apagadosSet = new Set(idsParaApagar);
      setRegistrosLista((lista) => lista.filter((r) => !apagadosSet.has(r.id)));
      if (registroAberto?.chave === registroParaApagar.chave) {
        setRegistroAberto(null);
        setFotoAbertaIdx(null);
      }
    }
    setApagando(false);
    setRegistroParaApagar(null);
  }

  async function salvarCorrecaoTipo() {
    if (!cavaParaCorrigir || !novoTipo) return;
    setCorrigindo(true);
    const resp = await fetch(`/api/registros/${cavaParaCorrigir.registroId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfAdmin, tipoCava: novoTipo }),
    });
    if (resp.ok) {
      // a cava corrigida muda de grupo (tipo mudou) — mais simples recarregar
      // a lista toda do que tentar remendar o estado local
      setCavaParaCorrigir(null);
      setRegistroAberto(null);
      setFotoAbertaIdx(null);
      await carregar(filtros);
    }
    setCorrigindo(false);
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
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {agrupados.map((g) => (
              <tr
                key={g.chave}
                style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                onClick={() => {
                  setRegistroAberto(g);
                  setFotoAbertaIdx(null);
                }}
              >
                <td style={{ padding: 8 }}>{g.data.slice(0, 10).split("-").reverse().join("/")}</td>
                <td style={{ padding: 8 }}>{g.obra}</td>
                <td style={{ padding: 8 }}>{g.tipoCava}</td>
                <td style={{ padding: 8 }}>{g.totalCavas}</td>
                <td style={{ padding: 8 }}>{g.operador}</td>
                <td style={{ padding: 8 }}>{g.fotos.length} 📷</td>
                <td style={{ padding: 8 }}>
                  <button
                    type="button"
                    className="foto-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRegistroParaApagar(g);
                    }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {agrupados.length === 0 && !carregando && (
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
              <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                <button
                  className="btn-voltar"
                  style={{ padding: "10px 16px", whiteSpace: "nowrap" }}
                  onClick={() => baixarTodasFotos(registroAberto)}
                >
                  ⬇️ Baixar todas
                </button>
                <button
                  className="foto-del"
                  style={{ width: "auto", padding: "10px 16px", whiteSpace: "nowrap" }}
                  onClick={() => setRegistroParaApagar(registroAberto)}
                >
                  🗑️ Apagar
                </button>
              </div>
            </div>
            {registroAberto.observacao && <p style={{ color: "#666" }}>Obs: {registroAberto.observacao}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 10, marginTop: 12 }}>
              {(() => {
                let cavaAnterior: number | null = null;
                return registroAberto.fotos.map((f, i) => {
                  const novaCava = f.cava !== cavaAnterior;
                  cavaAnterior = f.cava;
                  return (
                    <Fragment key={i}>
                      {novaCava && (
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: i === 0 ? 0 : 10,
                            paddingTop: i === 0 ? 0 : 10,
                            borderTop: i === 0 ? "none" : "1px solid #eee",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#1B4FA2", fontSize: 14 }}>
                            Cava {f.cava} — {registroAberto.tipoCava}
                          </span>
                          <button
                            type="button"
                            className="btn-voltar"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => {
                              setNovoTipo("");
                              setCavaParaCorrigir({ cava: f.cava, registroId: f.registroId, tipoAtual: registroAberto.tipoCava });
                            }}
                          >
                            ✏️ Corrigir tipo
                          </button>
                        </div>
                      )}
                      <div key={i}>
                        <button
                          type="button"
                          onClick={() => setFotoAbertaIdx(i)}
                          style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={f.url}
                            alt={f.label}
                            style={{ width: "100%", borderRadius: 8, objectFit: "cover", aspectRatio: "1" }}
                          />
                        </button>
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
                    </Fragment>
                  );
                });
              })()}
            </div>
            <button className="btn-voltar" style={{ marginTop: 16 }} onClick={() => setRegistroAberto(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {fotoAbertaIdx !== null && registroAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.94)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setFotoAbertaIdx(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFotoAbertaIdx(null);
            }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          {registroAberto.fotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFotoAbertaIdx((i) => (i === null ? i : (i - 1 + registroAberto.fotos.length) % registroAberto.fotos.length));
                }}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFotoAbertaIdx((i) => (i === null ? i : (i + 1) % registroAberto.fotos.length));
                }}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ›
              </button>
            </>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: "100%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={registroAberto.fotos[fotoAbertaIdx].url}
              alt={registroAberto.fotos[fotoAbertaIdx].label}
              style={{ maxWidth: "100%", maxHeight: "68vh", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
            />
            <div style={{ color: "#fff", fontSize: 14, textAlign: "center" }}>
              Cava {registroAberto.fotos[fotoAbertaIdx].cava}: {registroAberto.fotos[fotoAbertaIdx].label} ·{" "}
              {fotoAbertaIdx + 1}/{registroAberto.fotos.length}
            </div>
            <button
              className="btn-voltar"
              style={{ padding: "10px 20px" }}
              onClick={() => {
                const f = registroAberto.fotos[fotoAbertaIdx];
                baixarFoto(f.url, `obra${registroAberto.obra}_cava${f.cava}_${f.label.replace(/[^a-zA-Z0-9]+/g, "_")}.jpg`);
              }}
            >
              ⬇️ Baixar esta foto
            </button>
          </div>
        </div>
      )}

      {registroParaApagar && (
        <ConfirmModal
          titulo="Apagar registro"
          mensagem={`Apagar o registro da obra ${registroParaApagar.obra} (${registroParaApagar.tipoCava}, ${registroParaApagar.fotos.length} foto(s))? Essa ação não pode ser desfeita.`}
          textoConfirmar={apagando ? "Apagando..." : "Sim, apagar"}
          onConfirmar={apagarRegistroConfirmado}
          onCancelar={() => setRegistroParaApagar(null)}
        />
      )}

      {cavaParaCorrigir && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setCavaParaCorrigir(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#1B4FA2", marginBottom: 4 }}>Corrigir tipo da cava {cavaParaCorrigir.cava}</h3>
            <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
              Tipo atual: <strong>{cavaParaCorrigir.tipoAtual}</strong>
            </p>
            <select
              className="campo-grande"
              style={{ width: "100%", padding: 12, marginBottom: 16 }}
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
            >
              <option value="">Selecione o tipo certo...</option>
              {TIPOS_CAVA.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.id}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-voltar"
                style={{ flex: 1, padding: 12 }}
                onClick={() => setCavaParaCorrigir(null)}
                disabled={corrigindo}
              >
                Cancelar
              </button>
              <button
                className="btn-avancar"
                style={{ flex: 1, padding: 12 }}
                onClick={salvarCorrecaoTipo}
                disabled={corrigindo || !novoTipo || novoTipo === cavaParaCorrigir.tipoAtual}
              >
                {corrigindo ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
