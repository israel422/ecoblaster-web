"use client";

import { useCallback, useEffect, useState } from "react";
import { obterTurnosParaExibir, type TurnoExibicao } from "@/lib/turnos/obterTurnosParaExibir";
import { turnoCompleto, fotosFeitas, apagarTurno, type TurnoRegistro } from "@/lib/idb/turnosDb";
import { encerrarTurnoNoServidor } from "@/lib/sync/turnosServidor";
import { sincronizarTurno } from "@/lib/sync/sincronizarTurno";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { SessaoOperador } from "@/types";

interface Props {
  sessao: SessaoOperador;
  onContinuarFotos: (turno: TurnoRegistro) => void;
  onEditar: (turno: TurnoRegistro) => void;
  onNovoRegistro: () => void;
  onVazio: () => void;
}

export default function TurnosAbertosModal({ sessao, onContinuarFotos, onEditar, onNovoRegistro, onVazio }: Props) {
  const [turnos, setTurnos] = useState<TurnoExibicao[] | null>(null);
  const [sincronizando, setSincronizando] = useState<string | null>(null);
  const [progressoPorChave, setProgressoPorChave] = useState<Record<string, { feitas: number; total: number }>>({});
  const [erroPorChave, setErroPorChave] = useState<Record<string, string>>({});
  const [itemParaDescartar, setItemParaDescartar] = useState<TurnoExibicao | null>(null);

  const atualizar = useCallback(async () => {
    const lista = await obterTurnosParaExibir(sessao.cpf);
    setTurnos(lista);
    if (lista.length === 0) onVazio();
  }, [sessao.cpf, onVazio]);

  useEffect(() => {
    atualizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao.cpf]);

  if (!turnos || turnos.length === 0) return null;

  async function sincronizar(item: TurnoExibicao) {
    if (!item.local) return;
    setSincronizando(item.chave);
    setErroPorChave((p) => ({ ...p, [item.chave]: "" }));
    const resultado = await sincronizarTurno(item.local, (feitas, total) =>
      setProgressoPorChave((p) => ({ ...p, [item.chave]: { feitas, total } }))
    );
    if (resultado.sucesso) {
      if (item.local.id) await apagarTurno(item.local.id);
      await atualizar();
    } else {
      setErroPorChave((p) => ({ ...p, [item.chave]: resultado.erro || "Erro ao sincronizar" }));
    }
    setSincronizando(null);
  }

  async function descartarConfirmado() {
    const item = itemParaDescartar;
    setItemParaDescartar(null);
    if (!item) return;
    if (item.local) {
      if (item.local.id) await apagarTurno(item.local.id);
      if (item.local.serverId) await encerrarTurnoNoServidor(item.local.serverId, sessao.cpf);
    } else if (item.remoto) {
      await encerrarTurnoNoServidor(item.remoto.id, sessao.cpf);
    }
    await atualizar();
  }

  return (
    <div className="turnos-tela">
      <div className="turnos-card">
        <div className="turnos-titulo">Turnos em Aberto</div>
        <div className="turnos-sub">Registros ainda não sincronizados neste aparelho</div>

        {turnos.map((item) => {
          if (item.remoto) {
            return (
              <div key={item.chave} className="turno-item">
                <div className="turno-obra">
                  {sessao.admin ? `${item.remoto.operador} · ` : ""}Obra {item.remoto.obra} · {item.remoto.data}
                </div>
                <div className="turno-status">🔒 Turno iniciado em outro aparelho</div>
                {sessao.admin && (
                  <div className="turno-botoes">
                    <button type="button" className="foto-del turno-btn-descartar" onClick={() => setItemParaDescartar(item)}>
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            );
          }

          const local = item.local!;
          const total = local.fotos.length;
          const feitas = fotosFeitas(local);
          const completo = turnoCompleto(local);
          const progresso = progressoPorChave[item.chave];
          const erro = erroPorChave[item.chave];
          const estaEnviando = sincronizando === item.chave;

          return (
            <div key={item.chave} className="turno-item">
              <div className="turno-obra">
                {sessao.admin ? `${local.operador} · ` : ""}Obra {local.obra} · {local.data}
              </div>
              <div className="turno-status">
                {estaEnviando && progresso
                  ? `Enviando ${progresso.feitas}/${progresso.total}...`
                  : completo
                    ? "✅ Pronto pra sincronizar"
                    : `📷 Faltam ${total - feitas} de ${total} foto(s)`}
              </div>
              {erro && <div className="erro-inline">{erro}</div>}
              <div className="turno-botoes">
                {completo ? (
                  <>
                    <button
                      type="button"
                      className="turno-btn-secundario"
                      onClick={() => onEditar(local)}
                      disabled={estaEnviando}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      className="turno-btn-primario"
                      onClick={() => sincronizar(item)}
                      disabled={estaEnviando}
                    >
                      🔄 Sincronizar
                    </button>
                  </>
                ) : (
                  <button type="button" className="turno-btn-primario" onClick={() => onContinuarFotos(local)}>
                    📷 Concluir Fotos
                  </button>
                )}
                {sessao.admin && (
                  <button
                    type="button"
                    className="foto-del turno-btn-descartar"
                    onClick={() => setItemParaDescartar(item)}
                    disabled={estaEnviando}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button type="button" className="btn-avancar" onClick={onNovoRegistro} style={{ width: "100%", marginTop: 6 }}>
          + Novo Registro
        </button>
        {sessao.admin && (
          <a
            href="/painel"
            style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: 13, color: "#1a73e8" }}
          >
            📊 Ver Painel de Registros
          </a>
        )}
      </div>

      {itemParaDescartar && (
        <ConfirmModal
          titulo="Descartar turno"
          mensagem="Descartar esse turno e todas as fotos tiradas nele? Essa ação não pode ser desfeita."
          onConfirmar={descartarConfirmado}
          onCancelar={() => setItemParaDescartar(null)}
        />
      )}
    </div>
  );
}
