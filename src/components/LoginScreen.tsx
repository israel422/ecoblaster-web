"use client";

import { useState } from "react";
import { buscarOperador } from "@/lib/config/operadores";
import type { SessaoOperador } from "@/types";
import { reportarProblema } from "@/lib/problemas/reportar";

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
      if (digits.length >= 11) reportarProblema(digits, "cpf_invalido", digits, { cpfMascarado: `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}` });
      setTimeout(() => setErro(false), 3000);
      return;
    }
    onLogin({
      cpf: operador.cpf,
      nome: operador.nome,
      categoria: operador.categoria,
      admin: operador.admin,
    });

    // melhor esforço — se estiver offline, o login local já foi liberado acima
    fetch("/api/acessos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: digits }),
    }).catch(() => {});
  }

  return (
    <div className="login-tela">
      <div className="login-palco" aria-hidden="true" />
      {/* cartão = recorte do cartão da arte; campo e botão reais por cima dos desenhados */}
      <form
        className="login-cartao"
        aria-label="EcoBlaster — entrar com CPF"
        onSubmit={(e) => {
          e.preventDefault();
          tentarLogin();
        }}
      >
        <label className="login-cpf">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.2" />
            <path d="M3.5 21c.8-4.4 4.2-6.8 8.5-6.8s7.7 2.4 8.5 6.8z" />
          </svg>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            placeholder="000.000.000-00"
            aria-label="CPF"
            value={cpfMascarado}
            onChange={(e) => setCpfMascarado(mascararCPF(e.target.value))}
          />
        </label>
        <button type="submit" className="login-entrar">
          Entrar
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {erro && <div className="login-erro">CPF não autorizado.</div>}
      </form>
    </div>
  );
}
