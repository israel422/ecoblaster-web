"use client";

import { useEffect, useRef, useState } from "react";
import type { FotoItem } from "@/types";
import { stampPhoto, formatarDataHora } from "@/lib/camera/stampPhoto";
import PhotoPreviewModal from "@/components/camera/PhotoPreviewModal";
import ReferenciaFotoOverlay from "@/components/camera/ReferenciaFotoOverlay";
import { REFERENCIAS_FOTO } from "@/lib/config/referenciasFoto";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { iniciarGps, motivoSemGps, ouvirGps, posicaoParaFoto, reiniciarGps, statusGps } from "@/lib/camera/gps";
import { gpsDoExif } from "@/lib/camera/exifGps";

interface Props {
  obra: string;
  tipoCava: string;
  operador: string;
  fotos: FotoItem[];
  onFotosChange: (fotos: FotoItem[]) => void;
  erro: boolean;
  onVoltar: () => void;
  onAvancar: () => void;
}

export default function StepFotos({
  obra,
  tipoCava,
  operador,
  fotos,
  onFotosChange,
  erro,
  onVoltar,
  onAvancar,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const fotoIndexRef = useRef<number>(-1);
  const origemRef = useRef<"camera" | "galeria">("camera");
  // GPS da foto que está na pré-visualização (vai junto pro registro ao confirmar).
  const previewGpsRef = useRef<{ lat: number; lon: number } | null>(null);
  const previewMotivoRef = useRef<string | undefined>(undefined);
  const [gps, setGps] = useState(statusGps);
  const [obtendoGps, setObtendoGps] = useState(false);
  useEffect(() => {
    iniciarGps();
    setGps(statusGps());
    const parar = ouvirGps(() => setGps(statusGps()));
    const t = setInterval(() => setGps(statusGps()), 15_000); // a posição envelhece
    return () => {
      parar();
      clearInterval(t);
    };
  }, []);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [idxParaApagar, setIdxParaApagar] = useState<number | null>(null);
  const [referenciaParaIdx, setReferenciaParaIdx] = useState<number | null>(null);

  const feitas = fotos.filter((f) => f.blob).length;
  const qtdCavas = new Set(fotos.map((f) => f.cava)).size;

  // CRÍTICO: input.click() precisa rodar de forma síncrona dentro do toque do
  // usuário — senão o Safari no iOS ignora silenciosamente a chamada. O GPS já
  // está sendo acompanhado desde que o registro abriu (lib/camera/gps.ts).
  function tirarFoto(idx: number) {
    fotoIndexRef.current = idx;
    origemRef.current = "camera";
    inputRef.current?.click();
  }

  function escolherDaGaleria(idx: number) {
    fotoIndexRef.current = idx;
    origemRef.current = "galeria";
    inputGaleriaRef.current?.click();
  }

  async function processarFoto(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const idx = fotoIndexRef.current;
    const item = fotos[idx];
    if (!item) return;

    // Foto da galeria: vale o GPS gravado pela câmera na própria foto (onde ela foi tirada).
    // Foto na hora: GPS do celular (a última posição boa, ou espera até 10 s por uma).
    setObtendoGps(true);
    const exif = origemRef.current === "galeria" ? await gpsDoExif(file) : null;
    const pos = exif ?? (await posicaoParaFoto(10_000)) ?? (await gpsDoExif(file));
    setObtendoGps(false);
    const gps = pos ? { lat: pos.lat, lon: pos.lon } : null;
    previewGpsRef.current = gps;
    previewMotivoRef.current = gps ? undefined : motivoSemGps();
    const gpsStr = gps ? `GPS: ${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}` : "GPS: indisponível";

    const blob = await stampPhoto(file, {
      dataHoraStr: formatarDataHora(new Date()),
      obra,
      tipoCava,
      cava: item.cava,
      label: item.label,
      operador,
      gpsStr,
    });

    setPreviewBlob(blob);
  }

  function confirmarFoto() {
    if (!previewBlob) return;
    const idx = fotoIndexRef.current;
    const gps = previewGpsRef.current;
    const novaLista = fotos.map((f, i) =>
      i === idx ? { ...f, blob: previewBlob, lat: gps?.lat, lon: gps?.lon, gpsErro: gps ? undefined : previewMotivoRef.current } : f
    );
    onFotosChange(novaLista);
    setPreviewBlob(null);
  }

  function tirarNovamente() {
    setPreviewBlob(null);
    if (origemRef.current === "galeria") escolherDaGaleria(fotoIndexRef.current);
    else tirarFoto(fotoIndexRef.current);
  }

  function apagarFotoConfirmado() {
    const idx = idxParaApagar;
    if (idx === null) return;
    const novaLista = fotos.map((f, i) => (i === idx ? { ...f, blob: undefined, lat: undefined, lon: undefined, gpsErro: undefined } : f));
    onFotosChange(novaLista);
    setIdxParaApagar(null);
  }

  let cavaAtual = 0;

  return (
    <>
      <div className="passo-titulo">Fotos das Cavas</div>
      <div className="passo-sub">
        {qtdCavas} cava(s) neste turno · {feitas}/{fotos.length} fotos tiradas
      </div>
      <AvisoGps status={gps.status} precisao={gps.posicao?.precisao} obtendo={obtendoGps} />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => processarFoto(e.currentTarget)}
      />
      <input
        ref={inputGaleriaRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => processarFoto(e.currentTarget)}
      />

      <div style={{ overflowY: "auto", maxHeight: "52vh", marginTop: 4 }}>
        {fotos.map((item, idx) => {
          const novaCava = item.cava !== cavaAtual;
          if (novaCava) cavaAtual = item.cava;
          return (
            <div key={idx}>
              {novaCava && (
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#1b4fa2",
                    padding: "18px 0 8px",
                    borderTop: "2px solid #e0e8ff",
                    marginTop: 4,
                  }}
                >
                  Cava {item.cava}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: "1px solid #e8ecf0",
                  cursor: item.blob ? "default" : "pointer",
                }}
                onClick={() => {
                  if (item.blob) return;
                  if (REFERENCIAS_FOTO[item.label]) setReferenciaParaIdx(idx);
                  else tirarFoto(idx);
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                    background: item.blob ? "#e6f4ea" : "#f5f5f5",
                    border: item.blob ? "2px solid #34a853" : "2px dashed #b0bec5",
                  }}
                >
                  {item.blob ? "✅" : "📷"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#202124", lineHeight: 1.3 }}>
                    Foto {item.fotoNum}: {item.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
                    {item.blob ? "Foto tirada" : "Toque para fotografar"}
                  </div>
                </div>
                {!item.blob && (
                  <button
                    type="button"
                    className="foto-del"
                    title="Escolher da galeria"
                    onClick={(e) => {
                      e.stopPropagation();
                      escolherDaGaleria(idx);
                    }}
                  >
                    🖼️
                  </button>
                )}
                {item.blob && <PhotoThumb blob={item.blob} />}
                {item.blob && (
                  <button
                    type="button"
                    className="foto-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIdxParaApagar(idx);
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {erro && <div className="erro-inline">Tire todas as fotos obrigatórias antes de avançar.</div>}

      <div className="rodape">
        <button className="btn-voltar" onClick={onVoltar}>
          ← Voltar
        </button>
        <button className="btn-avancar" onClick={onAvancar}>
          Avançar →
        </button>
      </div>

      {previewBlob && (
        <PhotoPreviewModal blob={previewBlob} onConfirmar={confirmarFoto} onTirarNovamente={tirarNovamente} />
      )}

      {idxParaApagar !== null && (
        <ConfirmModal
          titulo="Apagar foto"
          mensagem="Apagar esta foto? Você poderá tirá-la novamente."
          onConfirmar={apagarFotoConfirmado}
          onCancelar={() => setIdxParaApagar(null)}
        />
      )}

      {referenciaParaIdx !== null && REFERENCIAS_FOTO[fotos[referenciaParaIdx].label] && (
        <ReferenciaFotoOverlay
          referencia={REFERENCIAS_FOTO[fotos[referenciaParaIdx].label]}
          onProsseguir={() => {
            const idx = referenciaParaIdx;
            setReferenciaParaIdx(null);
            tirarFoto(idx);
          }}
          onEscolherGaleria={() => {
            const idx = referenciaParaIdx;
            setReferenciaParaIdx(null);
            escolherDaGaleria(idx);
          }}
        />
      )}
    </>
  );
}

function PhotoThumb({ blob }: { blob: Blob }) {
  const [url] = useState(() => URL.createObjectURL(blob));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Miniatura"
      style={{ width: 64, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "2px solid #34a853" }}
    />
  );
}

// Faixa de localização na tela de fotos: diz se a coordenada vai sair na foto e como resolver
function AvisoGps({ status, precisao, obtendo }: { status: string; precisao?: number; obtendo: boolean }) {
  const base = { borderRadius: 10, padding: "10px 12px", margin: "8px 0 4px", fontSize: 13, lineHeight: 1.4 } as const;
  if (obtendo) return <div style={{ ...base, background: "#eef4ff", color: "#1b4fa2" }}>📍 Obtendo localização para a foto…</div>;
  if (status === "ok")
    return (
      <div style={{ ...base, background: "#e6f4ea", color: "#1e7b45" }}>
        📍 Localização OK{precisao ? ` (±${Math.round(precisao)} m)` : ""}
      </div>
    );
  if (status === "buscando")
    return (
      <div style={{ ...base, background: "#fff7e0", color: "#8a6000" }}>
        📍 Buscando localização… Se puder, espere uns segundos com o céu aberto antes da foto.
      </div>
    );
  const texto =
    status === "negado"
      ? "O Ecoblaster está SEM PERMISSÃO de localização. Toque no cadeado ao lado do endereço (ou ⋮ → Configurações do site) → Localização → Permitir. Depois toque em “Tentar de novo”."
      : status === "desligado"
        ? "O GPS do celular está DESLIGADO. Puxe a barra de cima e ligue a Localização. Depois toque em “Tentar de novo”."
        : status === "sem_suporte"
          ? "Este navegador não oferece localização. Abra o Ecoblaster no Chrome."
          : "Sem sinal de GPS agora. Vá para um lugar com céu aberto e toque em “Tentar de novo”.";
  return (
    <div style={{ ...base, background: "#fdecea", color: "#a32020", border: "1px solid #f5c2c0" }}>
      ⚠️ <b>A foto vai sair SEM coordenada.</b> {texto}
      <div>
        <button
          type="button"
          onClick={reiniciarGps}
          style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, border: "1px solid #a32020", background: "#fff", color: "#a32020", fontWeight: 700 }}
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
