"use client";

import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import WizardShell from "@/components/wizard/WizardShell";
import TurnosAbertosModal from "@/components/turnos/TurnosAbertosModal";
import OfflineBanner from "@/components/OfflineBanner";
import AlertModal from "@/components/ui/AlertModal";
import type { SessaoOperador } from "@/types";
import type { TurnoRegistro } from "@/lib/idb/turnosDb";
import { turnoCompleto } from "@/lib/idb/turnosDb";
import { obterTurnosParaExibir } from "@/lib/turnos/obterTurnosParaExibir";

export default function Home() {
  const [sessao, setSessao] = useState<SessaoOperador | null>(null);
  const [mostrarTurnos, setMostrarTurnos] = useState(false);
  const [turnoInicial, setTurnoInicial] = useState<TurnoRegistro | null>(null);
  const [passoInicial, setPassoInicial] = useState(1);
  const [wizardKey, setWizardKey] = useState(0);
  const [avisoBloqueio, setAvisoBloqueio] = useState<string | null>(null);

  function handleLogin(s: SessaoOperador) {
    setSessao(s);
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
      {sessao && mostrarTurnos && (
        <TurnosAbertosModal
          sessao={sessao}
          onContinuarFotos={continuarFotos}
          onEditar={editar}
          onNovoRegistro={novoRegistro}
          onVazio={() => setMostrarTurnos(false)}
        />
      )}
      {sessao && !mostrarTurnos && (
        <WizardShell key={wizardKey} sessao={sessao} turnoInicial={turnoInicial} passoInicial={passoInicial} />
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
