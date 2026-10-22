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
  origens?: Record<string, number>;
  fotosLonge?: number;
  kmLonge?: number;
  fotosCorrigidas?: number;
  registroIds?: number[];
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
  const [corrigindo, setCorrigindo] = useState<string | null>(null);

  async function usarCronograma(a: Aviso, chave: string) {
    if (!confirm(`Trocar a coordenada das ${a.fotosLonge} foto(s) da obra ${a.obra} (${a.operador}, ${dataBR(a.data)}) pela coordenada da obra no Cronograma?

A coordenada original fica guardada. O carimbo da foto não muda.`)) return;
    setCorrigindo(chave);
    await fetch("/api/avisos-gps/corrigir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfAdmin, ids: a.registroIds ?? [] }),
    });
    setCorrigindo(null);
    await buscar(dias);
  }

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
  for (const a of avisos.filter((x) => x.fotosPlanilha + x.fotosSemNada + (x.fotosLonge ?? 0) > 0)) porOperador.set(a.operador, (porOperador.get(a.operador) ?? 0) + 1);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ color: "#0f3b3c", fontSize: 26 }}>Avisos de GPS</h1>
        {onVoltar && (
          <button className="btn-voltar" style={{ padding: "10px 16px" }} onClick={onVoltar}>
            ← Menu
          </button>
        )}
      </div>
      <div style={{ color: "#5d6f6c", fontSize: 13, marginBottom: 14 }}>
        Fotos que NÃO pegaram o GPS normal do celular (com de onde veio a coordenada e o problema no celular) e fotos
        com GPS a mais de 3 km da obra no Cronograma de Obras — essas podem ser corrigidas para a coordenada do Cronograma.
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
          <b>Operadores com problema de localização:</b>{" "}
          {[...porOperador.entries()].sort((a, b) => b[1] - a[1]).map(([op, n]) => `${op} (${n} turno${n > 1 ? "s" : ""})`).join(" · ")}
        </div>
      )}

      {!carregando && avisos.length === 0 && <div style={{ color: "#2f9e4b", fontWeight: 600 }}>✅ Nenhum problema de localização nesse período.</div>}

      {avisos.map((a, i) => (
        <div key={`${a.data}|${a.obra}|${a.operador}|${i}`} style={{ padding: "12px 0", borderBottom: "1px solid #e1e8e5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <b>{a.operador}</b>
            <span style={{ color: "#5d6f6c", fontSize: 13 }}>{dataBR(a.data)}</span>
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>
            Obra <b>{a.obra}</b>
            {a.fotosPlanilha + a.fotosSemNada > 0 && <> · {a.fotosPlanilha + a.fotosSemNada} de {a.fotos} fotos sem GPS do celular</>}
          </div>
          {(a.fotosLonge ?? 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 6,
              background: "#fff4e5", border: "1px solid #f6d3a1", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 13, color: "#9a4b00" }}>
                📏 <b>{a.fotosLonge} foto(s) longe da obra</b>: GPS do celular a até {a.kmLonge?.toLocaleString("pt-BR")} km da coordenada da obra no Cronograma.
              </span>
              <button type="button" className="btn-avancar" style={{ padding: "7px 14px", fontSize: 13 }}
                disabled={corrigindo === `${a.data}|${a.obra}|${a.operador}`}
                onClick={() => usarCronograma(a, `${a.data}|${a.obra}|${a.operador}`)}>
                {corrigindo === `${a.data}|${a.obra}|${a.operador}` ? "Corrigindo..." : "Usar coordenada do cronograma"}
              </button>
            </div>
          )}
          {(a.fotosCorrigidas ?? 0) > 0 && (
            <div style={{ fontSize: 12, color: "#1e7b45", marginTop: 4 }}>
              ✅ {a.fotosCorrigidas} foto(s) corrigida(s) para a coordenada do Cronograma (a original ficou guardada).
            </div>
          )}
          {a.fotosPlanilha + a.fotosSemNada > 0 && (<>
          <div style={{ fontSize: 13, color: "#a32020", marginTop: 4 }}>
            Problema: {Object.entries(a.motivos).map(([m, n]) => `${m} (${n})`).join(" · ")}
          </div>
          <div style={{ fontSize: 12, color: a.fotosSemNada ? "#a32020" : "#1e7b45", marginTop: 2 }}>
            {a.fotosSemNada
              ? Object.keys(a.motivos).some((m) => m.includes("app antigo"))
                ? `⚠️ ${a.fotosSemNada} foto(s) sem coordenada: tiradas antes da correção do GPS (22/10).`
                : `⚠️ ${a.fotosSemNada} foto(s) ficaram sem coordenada: a obra não tem coordenada no Cronograma de Obras.`
              : `📍 Coordenada usada: ${Object.entries(a.origens ?? {}).map(([o, n]) => `${o} (${n})`).join(" · ") || "Cronograma de Obras"}`}
          </div>
          </>)}
        </div>
      ))}
    </div>
  );
}
