"use client";

import { useEffect, useMemo, useState } from "react";
import { OBRAS } from "@/lib/config/obras";
import { lerObrasExtraCache, atualizarObrasExtraCache } from "@/lib/obras/obrasExtra";

interface Props {
  valor: string;
  onSelecionar: (obra: string) => void;
  erro: boolean;
  onVoltar?: () => void;
  onAvancar: () => void;
}

export default function StepObra({ valor, onSelecionar, erro, onVoltar, onAvancar }: Props) {
  const [texto, setTexto] = useState(valor);
  const [aberta, setAberta] = useState(false);
  const [obrasExtra, setObrasExtra] = useState<string[]>(() => lerObrasExtraCache());

  useEffect(() => {
    atualizarObrasExtraCache().then(setObrasExtra);
  }, []);

  const todasObras = useMemo(() => Array.from(new Set([...OBRAS, ...obrasExtra])), [obrasExtra]);

  const termo = texto.trim();
  const opcoes = termo ? todasObras.filter((o) => o.includes(termo)) : todasObras;

  return (
    <>
      <div className="passo-titulo">Qual a obra?</div>
      <div className="passo-sub">Selecione o número da obra</div>
      <div className="select-wrap">
        <input
          className="campo-grande"
          placeholder="Digite o número da obra..."
          autoComplete="off"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          onBlur={() => setTimeout(() => setAberta(false), 150)}
        />
        <div className={`obra-lista${aberta ? " aberta" : ""}`}>
          {opcoes.length === 0 && (
            <div style={{ padding: "14px 18px", color: "#888", fontSize: 15 }}>Nenhuma obra encontrada</div>
          )}
          {opcoes.map((o) => (
            <div
              key={o}
              className="obra-opcao"
              onMouseDown={() => {
                setTexto(o);
                onSelecionar(o);
                setAberta(false);
              }}
            >
              {o}
            </div>
          ))}
        </div>
      </div>
      {erro && <div className="erro-inline">Selecione uma obra.</div>}
      <div className="rodape">
        {onVoltar && (
          <button className="btn-voltar" onClick={onVoltar}>
            ← Voltar
          </button>
        )}
        <button className="btn-avancar" onClick={onAvancar}>
          Avançar →
        </button>
      </div>
    </>
  );
}
