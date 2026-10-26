"use client";

import { useCallback, useEffect, useState } from "react";
import type { Problema } from "@/lib/problemas/servidor";

interface Props {
  cpfAdmin: string;
  onVoltar: () => void;
  onAvisosGps: () => void;
}

const COR = { alta: "#c5221f", media: "#d68a00", baixa: "#5d6f6c" };
const NOME = { alta: "Urgente", media: "Atenção", baixa: "Informativo" };

// Central de Problemas: tudo que o app avisou ou o servidor detectou, com a solução. Atualiza sozinha a cada 15 s.
export default function CentralProblemas({ cpfAdmin, onVoltar, onAvisosGps }: Props) {
  const [lista, setLista] = useState<Problema[] | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState("");
  const [fazendo, setFazendo] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    const r = await fetch(`/api/problemas?cpf=${encodeURIComponent(cpfAdmin)}`, { cache: "no-store" }).catch(() => null);
    if (r?.ok) {
      setLista(await r.json());
      setAtualizadoEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }
  }, [cpfAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial e a cada 15 s
    buscar();
    const t = setInterval(buscar, 15_000);
    return () => clearInterval(t);
  }, [buscar]);

  async function descartar(turnoId: string, chave: string) {
    if (!confirm("Descartar este turno? O celular do operador apaga a cópia na próxima vez que abrir o app e ele fica liberado para abrir turno novo.")) return;
    setFazendo(chave);
    await fetch(`/api/turnos-abertos/${turnoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encerradoPor: cpfAdmin }),
    }).catch(() => {});
    setFazendo(null);
    buscar();
  }

  async function resolver(id: number, chave: string) {
    setFazendo(chave);
    await fetch(`/api/problemas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cpf: cpfAdmin }) }).catch(() => {});
    setFazendo(null);
    buscar();
  }

  const contagem = (g: Problema["gravidade"]) => (lista ?? []).filter((p) => p.gravidade === g).length;

  return (
    <div className="central">
      <div className="central-topo">
        <div>
          <h1>Central de Problemas</h1>
          <p>O que está travando os operadores agora, com a solução. Atualiza sozinha a cada 15 segundos{atualizadoEm ? ` · última às ${atualizadoEm}` : ""}.</p>
        </div>
        <button className="btn-voltar" style={{ padding: "10px 16px" }} onClick={onVoltar}>← Menu</button>
      </div>

      <div className="central-resumo">
        {(["alta", "media", "baixa"] as const).map((g) => (
          <div key={g} className="central-cont" style={{ borderTopColor: COR[g] }}>
            <b style={{ color: COR[g] }}>{contagem(g)}</b>
            <span>{NOME[g]}</span>
          </div>
        ))}
        <button type="button" className="central-cont central-link" onClick={onAvisosGps}>
          <b>📍</b><span>Avisos de GPS</span>
        </button>
      </div>

      {lista === null && <p className="central-vazio">Carregando...</p>}
      {lista?.length === 0 && <p className="central-vazio ok">✅ Nenhum problema aberto agora.</p>}

      {lista?.map((p) => (
        <div key={p.id} className="central-item" style={{ borderLeftColor: COR[p.gravidade] }}>
          <div className="central-cab">
            <span className="central-selo" style={{ background: COR[p.gravidade] }}>{NOME[p.gravidade]}</span>
            <b>{p.quem}</b>
            <span className="central-quando">{p.quando}{p.vezes > 1 ? ` · ${p.vezes}x` : ""} · {p.origem === "app" ? "avisado pelo app" : "detectado pelo servidor"}</span>
          </div>
          <div className="central-titulo">{p.titulo}</div>
          {p.detalhe && <div className="central-detalhe">{p.detalhe}</div>}
          <div className="central-solucao"><b>Solução:</b> {p.solucao}</div>
          {p.acoes.length > 0 && (
            <div className="central-acoes">
              {p.acoes.map((a, i) =>
                a.tipo === "descartar_turno" ? (
                  <button key={i} className="btn-avancar" disabled={fazendo === p.id} onClick={() => descartar(a.turnoId, p.id)}>{a.rotulo}</button>
                ) : a.tipo === "resolver" ? (
                  <button key={i} className="btn-voltar" disabled={fazendo === p.id} onClick={() => resolver(a.id, p.id)}>Marcar como resolvido</button>
                ) : null
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
