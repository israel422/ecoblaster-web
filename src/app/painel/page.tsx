"use client";

import { useState } from "react";
import { buscarOperador } from "@/lib/config/operadores";
import PainelFotos from "@/components/painel/PainelFotos";

export default function PainelPage() {
  const [cpf, setCpf] = useState("");
  const [cpfAutorizado, setCpfAutorizado] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  function entrar() {
    const digits = cpf.replace(/\D/g, "");
    const operador = buscarOperador(digits);
    if (!operador || !operador.admin) {
      setErro("CPF não autorizado a acessar o painel.");
      return;
    }
    setCpfAutorizado(digits);
  }

  if (!cpfAutorizado) {
    return (
      <div className="splash">
        <div className="splash-card">
          <div className="splash-titulo">Painel Admin</div>
          <div className="splash-sub">EcoBlaster · Acesso restrito</div>
          <div style={{ width: "100%", textAlign: "left" }}>
            <label className="splash-label">CPF do admin</label>
            <input
              className="splash-input"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") entrar();
              }}
            />
          </div>
          {erro && <div className="splash-erro">{erro}</div>}
          <button className="splash-btn" onClick={entrar}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return <PainelFotos cpfAdmin={cpfAutorizado} />;
}
