"use client";

import { useEffect, useState } from "react";
interface OperadorRelatorio {
  cpf: string;
  nome: string;
}

interface Props {
  cpfAdmin: string;
  onVoltar?: () => void;
}

function hojeISO(): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  const dia = partes.find((p) => p.type === "day")!.value;
  return `${ano}-${mes}-${dia}`;
}

export default function RelatorioTurnos({ cpfAdmin, onVoltar }: Props) {
  const [data, setData] = useState(hojeISO());
  const [carregando, setCarregando] = useState(false);
  const [abriram, setAbriram] = useState<OperadorRelatorio[]>([]);
  const [naoAbriram, setNaoAbriram] = useState<OperadorRelatorio[]>([]);

  async function buscar(dataAlvo: string) {
    setCarregando(true);
    const resp = await fetch(`/api/relatorio-turnos?cpf=${encodeURIComponent(cpfAdmin)}&data=${dataAlvo}`);
    if (resp.ok) {
      const json = await resp.json();
      setAbriram(json.abriram);
      setNaoAbriram(json.naoAbriram);
    }
    setCarregando(false);
  }

  useEffect(() => {
    buscar(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ color: "#1B4FA2", fontSize: 26 }}>Relatório de Turnos</h1>
        {onVoltar && (
          <button className="btn-voltar" style={{ padding: "10px 16px" }} onClick={onVoltar}>
            ← Menu
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <input
          className="campo-grande"
          style={{ width: 180 }}
          type="date"
          value={data}
          onChange={(e) => {
            setData(e.target.value);
            buscar(e.target.value);
          }}
        />
        {carregando && <span style={{ color: "#888", fontSize: 13 }}>Carregando...</span>}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, color: "#1e8e3e", marginBottom: 8 }}>
          ✅ Abriram turno ({abriram.length})
        </div>
        {abriram.length === 0 && <div style={{ color: "#888" }}>Ninguém ainda.</div>}
        {abriram.map((o) => (
          <div key={o.cpf} style={{ padding: "8px 0", borderBottom: "1px solid #e8ecf0" }}>
            {o.nome}
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontWeight: 700, color: "#d93025", marginBottom: 8 }}>
          ❌ Não abriram turno ({naoAbriram.length})
        </div>
        {naoAbriram.length === 0 && <div style={{ color: "#888" }}>Todo mundo abriu 🎉</div>}
        {naoAbriram.map((o) => (
          <div key={o.cpf} style={{ padding: "8px 0", borderBottom: "1px solid #e8ecf0" }}>
            {o.nome}
          </div>
        ))}
      </div>
    </div>
  );
}
