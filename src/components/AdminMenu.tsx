"use client";

import { useEffect, useState } from "react";
import { ativarNotificacoes, notificacoesJaAtivas } from "@/lib/push/subscribePush";

interface Props {
  cpf: string;
  nome: string;
  onNovoRegistro: () => void;
  onPainelFotos: () => void;
  onPainelIndicadores: () => void;
  onGerenciarObras: () => void;
  onRelatorioTurnos: () => void;
}

export default function AdminMenu({
  cpf,
  nome,
  onNovoRegistro,
  onPainelFotos,
  onPainelIndicadores,
  onGerenciarObras,
  onRelatorioTurnos,
}: Props) {
  const [ativas, setAtivas] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    notificacoesJaAtivas().then(setAtivas);
  }, []);

  async function ativar() {
    setMensagem(null);
    const resultado = await ativarNotificacoes(cpf);
    if (resultado === "inscrito") {
      setAtivas(true);
      setMensagem("Notificações ativadas neste aparelho.");
    } else if (resultado === "negado") {
      setMensagem("Permissão de notificação negada. Ative nas configurações do navegador/app.");
    } else if (resultado === "sem_suporte") {
      setMensagem("Esse navegador não suporta notificações push.");
    } else {
      setMensagem("Não deu pra ativar agora. Tente de novo.");
    }
  }

  return (
    <div className="turnos-tela">
      <div className="turnos-card">
        <div className="turnos-titulo">Olá, {nome}</div>
        <div className="turnos-sub">O que você quer fazer?</div>

        <button type="button" className="btn-avancar" style={{ width: "100%", marginBottom: 14 }} onClick={onNovoRegistro}>
          📝 Novo Registro
        </button>
        <button type="button" className="btn-avancar" style={{ width: "100%", marginBottom: 14 }} onClick={onPainelFotos}>
          📷 Painel de Fotos
        </button>
        <button type="button" className="btn-avancar" style={{ width: "100%", marginBottom: 14 }} onClick={onPainelIndicadores}>
          📊 Painel de Indicadores
        </button>
        <button type="button" className="btn-avancar" style={{ width: "100%", marginBottom: 14 }} onClick={onGerenciarObras}>
          🏗️ Obras
        </button>
        <button type="button" className="btn-avancar" style={{ width: "100%", marginBottom: 14 }} onClick={onRelatorioTurnos}>
          📋 Relatório de Turnos
        </button>
        <button type="button" className="btn-avancar" style={{ width: "100%" }} onClick={ativar} disabled={ativas}>
          {ativas ? "🔔 Notificações ativadas" : "🔔 Ativar notificações"}
        </button>
        {mensagem && <div className="passo-sub" style={{ marginTop: 10 }}>{mensagem}</div>}
      </div>
    </div>
  );
}
