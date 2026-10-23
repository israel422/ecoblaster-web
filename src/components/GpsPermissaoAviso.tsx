"use client";

import { useCallback, useEffect, useState } from "react";
import { iniciarGps, ouvirGps, reiniciarGps, statusGps } from "@/lib/camera/gps";

type Permissao = "liberada" | "perguntar" | "bloqueada" | "desconhecida";

// Situação da permissão de localização do navegador para o Ecoblaster.
// Usa a Permissions API quando existe; senão (alguns iPhones) vale o erro do próprio GPS.
async function lerPermissao(): Promise<Permissao> {
  try {
    const p = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (p) return p.state === "granted" ? "liberada" : p.state === "prompt" ? "perguntar" : "bloqueada";
  } catch {
    // navegador sem Permissions API para localização
  }
  return statusGps().status === "negado" ? "bloqueada" : "desconhecida";
}

// Janela que pede ao operador para liberar a localização, sempre que ela não estiver liberada.
// Volta a aparecer toda vez que o app é aberto ou volta para a tela, até liberar.
export default function GpsPermissaoAviso() {
  const [permissao, setPermissao] = useState<Permissao>("desconhecida");
  const [adiado, setAdiado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [aindaBloqueado, setAindaBloqueado] = useState(false);

  const verificar = useCallback(async () => {
    const p = await lerPermissao();
    setPermissao(p);
    return p;
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    iniciarGps();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura inicial da permissão do navegador
    verificar();
    let status: PermissionStatus | undefined;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((s) => {
        status = s;
        s.onchange = () => {
          verificar();
          if (s.state === "granted") reiniciarGps();
        };
      })
      .catch(() => {});
    const pararGps = ouvirGps(() => {
      if (statusGps().status === "negado") setPermissao("bloqueada");
    });
    // o operador sai para as configurações e volta: confere de novo e mostra outra vez se continuar bloqueado
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      setAdiado(false);
      verificar().then((p) => p === "liberada" && reiniciarGps());
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      pararGps();
      document.removeEventListener("visibilitychange", aoVoltar);
      if (status) status.onchange = null;
    };
  }, [verificar]);

  // "Permitir": faz o navegador mostrar o pedido de permissão
  function pedirPermissao() {
    setVerificando(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setVerificando(false);
        setPermissao("liberada");
        reiniciarGps();
      },
      async (erro) => {
        setVerificando(false);
        if (erro.code === 1) {
          setPermissao("bloqueada");
          setAindaBloqueado(true);
        } else {
          await verificar();
          reiniciarGps();
        }
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  }

  async function jaLiberei() {
    setVerificando(true);
    const p = await verificar();
    if (p === "liberada") reiniciarGps();
    else if (p === "perguntar") pedirPermissao();
    else setAindaBloqueado(true);
    setVerificando(false);
  }

  if (adiado || (permissao !== "perguntar" && permissao !== "bloqueada")) return null;

  return (
    <div className="gps-perm-fundo" role="dialog" aria-modal="true" aria-labelledby="gpsPermTitulo">
      <div className="gps-perm-caixa">
        <div className="gps-perm-ico" aria-hidden="true">📍</div>
        <h2 id="gpsPermTitulo">Libere a localização do Ecoblaster</h2>
        <p>
          A localização do celular está <b>{permissao === "bloqueada" ? "bloqueada" : "desligada"}</b> para o Ecoblaster. Sem ela, as fotos das cavas
          saem sem a coordenada do local e o registro fica com aviso para o escritório.
        </p>

        {permissao === "perguntar" ? (
          <>
            <p>Toque no botão abaixo e, na pergunta do celular, escolha <b>Permitir</b>.</p>
            <button type="button" className="btn-avancar gps-perm-btn" onClick={pedirPermissao} disabled={verificando}>
              {verificando ? "Aguardando..." : "Permitir localização"}
            </button>
          </>
        ) : (
          <>
            <ol className="gps-perm-passos">
              <li>
                Toque no <b>cadeado 🔒</b> ao lado do endereço do site (ou nos <b>⋮</b> → <b>Configurações do site</b>).
              </li>
              <li>
                Em <b>Permissões</b>, toque em <b>Localização</b> e escolha <b>Permitir</b>.
              </li>
              <li>
                Se não aparecer: <b>Configurações do celular</b> → <b>Apps</b> → <b>Chrome</b> → <b>Permissões</b> → <b>Localização</b> →{" "}
                <b>Permitir durante o uso do app</b>.
              </li>
              <li>
                Deixe a <b>Localização (GPS)</b> do celular ligada na barra de cima.
              </li>
            </ol>
            {aindaBloqueado && <p className="gps-perm-erro">Ainda está bloqueada. Faça os passos acima e toque de novo.</p>}
            <button type="button" className="btn-avancar gps-perm-btn" onClick={jaLiberei} disabled={verificando}>
              {verificando ? "Verificando..." : "Já liberei — verificar"}
            </button>
          </>
        )}
        <button type="button" className="gps-perm-depois" onClick={() => setAdiado(true)}>
          Agora não (o aviso volta quando abrir o app)
        </button>
      </div>
    </div>
  );
}
