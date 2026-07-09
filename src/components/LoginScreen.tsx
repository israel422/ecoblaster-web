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

    // melhor esforço — se estiver offline, o login local já foi liberado acima
    fetch("/api/acessos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: digits }),
    }).catch(() => {});
  }

  return (
    <div className="login-tela">
      <div className="login-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login-hero.jpg" alt="" aria-hidden="true" className="login-hero-img" />
      </div>

      <div className="login-card-wrap">
        <div className="login-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo-watermark.png" alt="Ecoelétrica Engenharia" className="login-logo" />
          <div className="login-app-nome">EcoBlaster</div>
          <div className="login-boas-vindas">Bem-vindo!</div>
          <div className="login-instrucao">Digite seu CPF para acessar o sistema.</div>

          <div style={{ width: "100%", textAlign: "left" }}>
            <label className="splash-label">CPF</label>
            <div className="login-input-wrap">
              <input
                className="splash-input login-input"
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
              <span className="login-input-icon">👤</span>
            </div>
          </div>

          {erro && <div className="splash-erro">CPF não autorizado.</div>}

          <button className="login-btn" onClick={tentarLogin}>
            Entrar <span>→</span>
          </button>

          <div className="login-seguro">🛡️ Acesso seguro e protegido</div>
        </div>
      </div>
    </div>
  );
}
