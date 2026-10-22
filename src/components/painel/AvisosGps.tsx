"use client";

import { useEffect, useState } from "react";

interface Aviso {
  data: string;
  obra: string;
  operador: string;
  fotos: number;
  fotosPlanilha: number;
  fotosSemNada: number;
  motivos: Record<string, number>;
}

interface Props {
  cpfAdmin: string;
  onVoltar?: () => void;
}

const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

// Turnos em que o GPS do celular falhou e a coordenada veio da planilha do cronograma —
// com o problema de cada operador, para corrigir o celular dele.
export default function AvisosGps({ cpfAdmin, onVoltar }: Props) {
  const [dias, setDias] = useState(7);
  const [carregando, setCarregando] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  async function buscar(d: number) {
    setCarregando(true);
    const resp = await fetch(`/api/avisos-gps?cpf=${encodeURIComponent(cpfAdmin)}&dias=${d}`);
    if (resp.ok) setAvisos(await resp.json());
    setCarregando(false);
  }

  useEffect(() => {
    buscar(dias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const porOperador = new Map<string, number>();
  for (const a of avisos) porOperador.set(a.operador, (porOperador.get(a.operador) ?? 0) + 1);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ color: "#1B4FA2", fontSize: 26 }}>Avisos de GPS</h1>
        {onVoltar && (
          <button className="btn-voltar" style={{ padding: "10px 16px" }} onClick={onVoltar}>
            ← Menu
          </button>
        )}
      </div>
      <div style={{ color: "#5f6368", fontSize: 13, marginBottom: 14 }}>
        Turnos em que o celular não conseguiu o GPS e a foto recebeu a coordenada da obra no Cronograma de Obras.
        Resolva o problema no celular do operador para a coordenada voltar a ser a exata da cava.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {[1, 7, 30].map((d) => (
          <button
            key={d}
            type="button"
            className={d === dias ? "btn-avancar" : "btn-voltar"}
            style={{ padding: "8px 14px" }}
            onClick={() => {
              setDias(d);
              buscar(d);
            }}
          >
            {d === 1 ? "Hoje" : `Últimos ${d} dias`}
          </button>
        ))}
        {carregando && <span style={{ color: "#888", fontSize: 13 }}>Carregando...</span>}
      </div>

      {porOperador.size > 0 && (
        <div style={{ background: "#fdecea", border: "1px solid #f5c2c0", borderRadius: 12, padding: "10px 14px", marginBottom: 16, color: "#a32020", fontSize: 14 }}>
          <b>Operadores com problema de GPS:</b>{" "}
          {[...porOperador.entries()].sort((a, b) => b[1] - a[1]).map(([op, n]) => `${op} (${n} turno${n > 1 ? "s" : ""})`).join(" · ")}
        </div>
      )}

      {!carregando && avisos.length === 0 && <div style={{ color: "#1e8e3e", fontWeight: 600 }}>✅ Nenhuma foto sem GPS do celular nesse período.</div>}

      {avisos.map((a, i) => (
        <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #e8ecf0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <b>{a.operador}</b>
            <span style={{ color: "#5f6368", fontSize: 13 }}>{dataBR(a.data)}</span>
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>
            Obra <b>{a.obra}</b> · {a.fotosPlanilha + a.fotosSemNada} de {a.fotos} fotos sem GPS do celular
          </div>
          <div style={{ fontSize: 13, color: "#a32020", marginTop: 4 }}>
            Problema: {Object.entries(a.motivos).map(([m, n]) => `${m} (${n})`).join(" · ")}
          </div>
          <div style={{ fontSize: 12, color: a.fotosSemNada ? "#a32020" : "#1e7b45", marginTop: 2 }}>
            {a.fotosSemNada
              ? `⚠️ ${a.fotosSemNada} foto(s) ficaram sem coordenada: a obra não tem coordenada no Cronograma de Obras.`
              : "📍 Coordenada da obra no Cronograma de Obras usada nas fotos."}
          </div>
        </div>
      ))}
    </div>
  );
}
