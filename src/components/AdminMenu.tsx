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
  onAvisosGps: () => void;
}

// Ícones de traço (mesmo estilo do Mapa de Rocha)
const ICONES: Record<string, React.ReactNode> = {
  registro: <><path d="M12 5v14M5 12h14" /></>,
  fotos: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M8.5 6 10 3.5h4L15.5 6" /><circle cx="12" cy="13" r="3.6" /></>,
  indicadores: <><path d="M4 20V11M10 20V5M16 20v-6M22 20H2" /></>,
  obras: <><path d="M3 21h18" /><path d="M5 21V10l7-5 7 5v11" /><path d="M10 21v-6h4v6" /></>,
  turnos: <><rect x="4" y="3.5" width="16" height="18" rx="2.5" /><path d="M9 3.5V2h6v1.5" /><path d="M8.5 11l2 2 4-4M8.5 17h7" /></>,
  gps: <><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.6" /></>,
  sino: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
};
const Icone = ({ nome }: { nome: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">{ICONES[nome]}</svg>
);

export default function AdminMenu({
  cpf,
  nome,
  onNovoRegistro,
  onPainelFotos,
  onPainelIndicadores,
  onGerenciarObras,
  onRelatorioTurnos,
  onAvisosGps,
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

  const partes = nome.trim().split(/\s+/);
  const primeiroNome = partes[0] ? partes[0][0] + partes[0].slice(1).toLowerCase() : "";

  const itens = [
    { icone: "fotos", titulo: "Painel de Fotos", texto: "Fotos das cavas por obra, operador e dia", acao: onPainelFotos },
    { icone: "indicadores", titulo: "Painel de Indicadores", texto: "Produção, obras e dias trabalhados", acao: onPainelIndicadores },
    { icone: "obras", titulo: "Obras", texto: "Incluir e remover obras do app", acao: onGerenciarObras },
    { icone: "turnos", titulo: "Relatório de Turnos", texto: "Quem abriu e quem não abriu turno", acao: onRelatorioTurnos },
    { icone: "gps", titulo: "Avisos de GPS", texto: "Fotos sem GPS do celular e o motivo", acao: onAvisosGps },
  ];

  return (
    <div className="eco-pagina">

      <main className="eco-conteudo">
        <div className="eco-titulo">
          <div>
            <h1>Olá, {primeiroNome}</h1>
            <p>O que você quer fazer?</p>
          </div>
          <button type="button" className={`eco-sino ${ativas ? "on" : ""}`} onClick={ativar} disabled={ativas}>
            <Icone nome="sino" />
            {ativas ? "Notificações ativadas" : "Ativar notificações"}
          </button>
        </div>
        {mensagem && <div className="eco-aviso">{mensagem}</div>}

        <button type="button" className="eco-destaque" onClick={onNovoRegistro}>
          <span className="eco-ico grande"><Icone nome="registro" /></span>
          <span>
            <b>Novo Registro</b>
            <small>Registrar a cava e as fotos do turno</small>
          </span>
          <svg className="eco-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>

        <div className="eco-grade">
          {itens.map((i) => (
            <button key={i.titulo} type="button" className="eco-cartao" onClick={i.acao}>
              <span className="eco-ico"><Icone nome={i.icone} /></span>
              <span>
                <b>{i.titulo}</b>
                <small>{i.texto}</small>
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
