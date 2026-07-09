"use client";

import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import WizardShell from "@/components/wizard/WizardShell";
import TurnosAbertosModal from "@/components/turnos/TurnosAbertosModal";
import OfflineBanner from "@/components/OfflineBanner";
import AlertModal from "@/components/ui/AlertModal";
import AdminMenu from "@/components/AdminMenu";
import PainelFotos from "@/components/painel/PainelFotos";
import PainelIndicadores from "@/components/painel/PainelIndicadores";
import type { SessaoOperador } from "@/types";
import type { TurnoRegistro } from "@/lib/idb/turnosDb";
import { turnoCompleto } from "@/lib/idb/turnosDb";
import { obterTurnosParaExibir } from "@/lib/turnos/obterTurnosParaExibir";

export default function Home() {
  const [sessao, setSessao] = useState<SessaoOperador | null>(null);
  const [telaAdmin, setTelaAdmin] = useState<"menu" | "fotos" | "indicadores" | null>(null);
  const [mostrarTurnos, setMostrarTurnos] = useState(false);
  const [turnoInicial, setTurnoInicial] = useState<TurnoRegistro | null>(null);
  const [passoInicial, setPassoInicial] = useState(1);
  const [wizardKey, setWizardKey] = useState(0);
  const [avisoBloqueio, setAvisoBloqueio] = useState<string | null>(null);

  function handleLogin(s: SessaoOperador) {
    setSessao(s);
    if (s.admin) {
      setTelaAdmin("menu");
    } else {
      setMostrarTurnos(true);
    }
  }

  function irNovoRegistro() {
    setTelaAdmin(null);
    setMostrarTurnos(true);
  }

  function continuarFotos(turno: TurnoRegistro) {
    setTurnoInicial(turno);
    setPassoInicial(6);
    setMostrarTurnos(false);
    setWizardKey((k) => k + 1);
  }

  function editar(turno: TurnoRegistro) {
    setTurnoInicial(turno);
    setPassoInicial(1);
    setMostrarTurnos(false);
    setWizardKey((k) => k + 1);
  }

  async function novoRegistro() {
    if (!sessao) return;
    const lista = await obterTurnosParaExibir(sessao.cpf);
    const pendentes = lista.filter((t) => {
      if (t.remoto) return t.remoto.cpf === sessao.cpf;
      if (t.local) return t.local.cpf === sessao.cpf && !turnoCompleto(t.local);
      return false;
    });
    if (pendentes.length > 0) {
      const nomes = pendentes
        .map((t) => `Obra ${t.remoto?.obra || t.local?.obra}${t.remoto ? " (outro aparelho)" : ""}`)
        .join(", ");
      setAvisoBloqueio(`Termine de tirar todas as fotos antes de iniciar um novo registro. Pendente(s): ${nomes}`);
      return;
    }
    setTurnoInicial(null);
    setPassoInicial(1);
    setMostrarTurnos(false);
    setWizardKey((k) => k + 1);
  }

  return (
    <>
      <OfflineBanner />
      {!sessao && <LoginScreen onLogin={handleLogin} />}

      {sessao && sessao.admin && telaAdmin === "menu" && (
        <AdminMenu
          nome={sessao.nome}
          onNovoRegistro={irNovoRegistro}
          onPainelFotos={() => setTelaAdmin("fotos")}
          onPainelIndicadores={() => setTelaAdmin("indicadores")}
        />
      )}
      {sessao && sessao.admin && telaAdmin === "fotos" && (
        <PainelFotos cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} />
      )}
      {sessao && sessao.admin && telaAdmin === "indicadores" && (
        <PainelIndicadores cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} />
      )}

      {sessao && telaAdmin === null && mostrarTurnos && (
        <TurnosAbertosModal
          sessao={sessao}
          onContinuarFotos={continuarFotos}
          onEditar={editar}
          onNovoRegistro={novoRegistro}
          onVazio={() => setMostrarTurnos(false)}
          onAbrirPainel={sessao.admin ? () => setTelaAdmin("menu") : undefined}
        />
      )}
      {sessao && telaAdmin === null && !mostrarTurnos && (
        <WizardShell
          key={wizardKey}
          sessao={sessao}
          turnoInicial={turnoInicial}
          passoInicial={passoInicial}
          onAbrirPainel={sessao.admin ? () => setTelaAdmin("menu") : undefined}
        />
      )}

      {avisoBloqueio && (
        <AlertModal
          titulo="Fotos pendentes"
          mensagem={avisoBloqueio}
          onFechar={() => setAvisoBloqueio(null)}
        />
      )}
    </>
  );
}
