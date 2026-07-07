"use client";

import { useState } from "react";
import { buscarOperador } from "@/lib/config/operadores";
import type { SessaoOperador } from "@/types";

function mascararCPF(valor: string): string {
  let v = valor.replace(/\D/g, "").slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  return v;
}

export default function LoginScreen({ onLogin }: { onLogin: (sessao: SessaoOperador) => void }) {
  const [cpfMascarado, setCpfMascarado] = useState("");
  const [erro, setErro] = useState(false);

  function tentarLogin() {
    const digits = cpfMascarado.replace(/\D/g, "");
    const operador = buscarOperador(digits);
    if (!operador) {
      setErro(true);
      setTimeout(() => setErro(false), 3000);
      return;
    }
    onLogin({
      cpf: operador.cpf,
      nome: operador.nome,
      categoria: operador.categoria,
      admin: operador.admin,
    });
  }

  return (
    <div className="splash">
      <div className="splash-card">
        <div className="splash-titulo">EcoBlaster</div>
        <div className="splash-sub">Ecoelétrica Engenharia · Escavação</div>
        <div style={{ width: "100%", textAlign: "left" }}>
          <label className="splash-label">Digite seu CPF</label>
          <input
            className="splash-input"
            type="tel"
            inputMode="numeric"
            maxLength={14}
            placeholder="000.000.000-00"
            value={cpfMascarado}
            onChange={(e) => setCpfMascarado(mascararCPF(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") tentarLogin();
            }}
          />
        </div>
        {erro && <div className="splash-erro">CPF não autorizado.</div>}
        <button className="splash-btn" onClick={tentarLogin}>
          Entrar
        </button>
      </div>
    </div>
  );
}
