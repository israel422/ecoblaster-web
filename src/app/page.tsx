"use client";

import { useEffect, useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import WizardShell from "@/components/wizard/WizardShell";
import TurnosAbertosModal from "@/components/turnos/TurnosAbertosModal";
import OfflineBanner from "@/components/OfflineBanner";
import AlertModal from "@/components/ui/AlertModal";
import AdminMenu from "@/components/AdminMenu";
import EcoTopo from "@/components/EcoTopo";
import GpsPermissaoAviso from "@/components/GpsPermissaoAviso";
import PainelFotos from "@/components/painel/PainelFotos";
import PainelIndicadores from "@/components/painel/PainelIndicadores";
import GerenciarObras from "@/components/painel/GerenciarObras";
import RelatorioTurnos from "@/components/painel/RelatorioTurnos";
import AvisosGps from "@/components/painel/AvisosGps";
import CentralProblemas from "@/components/painel/CentralProblemas";
import type { SessaoOperador } from "@/types";
import type { TurnoRegistro } from "@/lib/idb/turnosDb";
import { turnoCompleto } from "@/lib/idb/turnosDb";
import { obterTurnosParaExibir } from "@/lib/turnos/obterTurnosParaExibir";
import { reportarProblema } from "@/lib/problemas/reportar";

export default function Home() {
  const [sessao, setSessao] = useState<SessaoOperador | null>(null);
  const [telaAdmin, setTelaAdmin] = useState<"menu" | "fotos" | "indicadores" | "obras" | "relatorio" | "gps" | "problemas" | null>(null);
  const [mostrarTurnos, setMostrarTurnos] = useState(false);
  const [turnoInicial, setTurnoInicial] = useState<TurnoRegistro | null>(null);
  const [passoInicial, setPassoInicial] = useState(1);
  const [wizardKey, setWizardKey] = useState(0);
  const [avisoBloqueio, setAvisoBloqueio] = useState<string | null>(null);

  // erro inesperado na tela de quem está usando: avisa a Central de Problemas
  useEffect(() => {
    if (!sessao) return;
    const ignorar = /ResizeObserver|extension|chrome-extension|Script error/i;
    const avisar = (mensagem: string) => {
      if (!mensagem || ignorar.test(mensagem)) return;
      reportarProblema(sessao.cpf, "erro_app", mensagem.slice(0, 80), { mensagem: mensagem.slice(0, 300), tela: telaAdmin ?? (mostrarTurnos ? "turnos" : "registro") });
    };
    const onErro = (e: ErrorEvent) => avisar(e.message);
    const onPromessa = (e: PromiseRejectionEvent) => avisar(String((e.reason as Error)?.message ?? e.reason ?? ""));
    window.addEventListener("error", onErro);
    window.addEventListener("unhandledrejection", onPromessa);
    return () => {
      window.removeEventListener("error", onErro);
      window.removeEventListener("unhandledrejection", onPromessa);
    };
  }, [sessao, telaAdmin, mostrarTurnos]);

  function handleLogin(s: SessaoOperador) {
    setSessao(s);
    if (s.admin) {
      const params = new URLSearchParams(window.location.search);
      setTelaAdmin(params.get("tela") === "relatorio-turnos" ? "relatorio" : params.get("tela") === "avisos-gps" ? "gps" : params.get("tela") === "problemas" ? "problemas" : "menu");
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
    setPassoInicial(5);
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
      reportarProblema(sessao.cpf, "turno_pendente", pendentes.map((t) => t.remoto?.id || t.local?.serverId || t.local?.obra).join(","), {
        obras: pendentes.map((t) => t.remoto?.obra || t.local?.obra),
        turnos: pendentes.map((t) => ({ serverId: t.remoto?.id || t.local?.serverId, obra: t.remoto?.obra || t.local?.obra, data: t.remoto?.data || t.local?.data, outroAparelho: !!t.remoto })),
      });
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
      {/* operador sem localização liberada: pede a liberação (volta toda vez que abrir o app) */}
      {sessao && !sessao.admin && <GpsPermissaoAviso cpf={sessao.cpf} />}
      {sessao && (
        <EcoTopo
          nome={sessao.nome}
          papel={sessao.admin ? "Administrador" : "Operador"}
          onLogo={sessao.admin && telaAdmin !== "menu" ? () => setTelaAdmin("menu") : undefined}
        />
      )}

      {sessao && sessao.admin && telaAdmin === "menu" && (
        <AdminMenu
          cpf={sessao.cpf}
          nome={sessao.nome}
          onNovoRegistro={irNovoRegistro}
          onPainelFotos={() => setTelaAdmin("fotos")}
          onPainelIndicadores={() => setTelaAdmin("indicadores")}
          onGerenciarObras={() => setTelaAdmin("obras")}
          onRelatorioTurnos={() => setTelaAdmin("relatorio")}
          onAvisosGps={() => setTelaAdmin("gps")}
          onProblemas={() => setTelaAdmin("problemas")}
        />
      )}
      {sessao && sessao.admin && telaAdmin === "relatorio" && (
        <RelatorioTurnos cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} />
      )}
      {sessao && sessao.admin && telaAdmin === "problemas" && (
        <CentralProblemas cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} onAvisosGps={() => setTelaAdmin("gps")} />
      )}
      {sessao && sessao.admin && telaAdmin === "gps" && (
        <AvisosGps cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} />
      )}
      {sessao && sessao.admin && telaAdmin === "fotos" && (
        <PainelFotos cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} />
      )}
      {sessao && sessao.admin && telaAdmin === "indicadores" && (
        <PainelIndicadores cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} />
      )}
      {sessao && sessao.admin && telaAdmin === "obras" && (
        <GerenciarObras cpfAdmin={sessao.cpf} onVoltar={() => setTelaAdmin("menu")} />
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
          onVoltarInicio={sessao.admin ? () => setTelaAdmin("menu") : () => setMostrarTurnos(true)}
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
