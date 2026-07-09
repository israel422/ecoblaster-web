"use client";

import { useRef, useState } from "react";
import type { FotoItem } from "@/types";
import { stampPhoto, formatarDataHora } from "@/lib/camera/stampPhoto";
import PhotoPreviewModal from "@/components/camera/PhotoPreviewModal";
import ReferenciaFotoOverlay from "@/components/camera/ReferenciaFotoOverlay";
import ConfirmModal from "@/components/ui/ConfirmModal";

const LABEL_ANTES_DO_SOLO = "Antes de explorar o solo";

interface Props {
  obra: string;
  tipoCava: string;
  totalCavas: string;
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
  totalCavas,
  operador,
  fotos,
  onFotosChange,
  erro,
  onVoltar,
  onAvancar,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fotoIndexRef = useRef<number>(-1);
  const gpsRef = useRef<{ lat: number; lon: number } | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [idxParaApagar, setIdxParaApagar] = useState<number | null>(null);
  const [referenciaParaIdx, setReferenciaParaIdx] = useState<number | null>(null);

  const feitas = fotos.filter((f) => f.blob).length;

  // CRÍTICO: input.click() precisa rodar de forma síncrona dentro do toque do
  // usuário. O GPS é buscado em paralelo, sem bloquear a abertura da câmera —
  // senão o Safari no iOS ignora silenciosamente a chamada.
  function tirarFoto(idx: number) {
    fotoIndexRef.current = idx;
    gpsRef.current = null;
    inputRef.current?.click();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        },
        () => {
          gpsRef.current = null;
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    }
  }

  async function processarFoto(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const idx = fotoIndexRef.current;
    const item = fotos[idx];
    if (!item) return;

    const gps = gpsRef.current;
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
    const novaLista = fotos.map((f, i) => (i === idx ? { ...f, blob: previewBlob } : f));
    onFotosChange(novaLista);
    setPreviewBlob(null);
  }

  function tirarNovamente() {
    setPreviewBlob(null);
    tirarFoto(fotoIndexRef.current);
  }

  function apagarFotoConfirmado() {
    const idx = idxParaApagar;
    if (idx === null) return;
    const novaLista = fotos.map((f, i) => (i === idx ? { ...f, blob: undefined } : f));
    onFotosChange(novaLista);
    setIdxParaApagar(null);
  }

  let cavaAtual = 0;

  return (
    <>
      <div className="passo-titulo">Fotos das Cavas</div>
      <div className="passo-sub">
        {totalCavas} cava(s) · {fotos.length > 0 ? fotos.length / Number(totalCavas || 1) : 0} foto(s) cada ·{" "}
        {feitas}/{fotos.length} fotos tiradas
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
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
                  if (item.label === LABEL_ANTES_DO_SOLO) setReferenciaParaIdx(idx);
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

      {referenciaParaIdx !== null && (
        <ReferenciaFotoOverlay
          onProsseguir={() => {
            const idx = referenciaParaIdx;
            setReferenciaParaIdx(null);
            tirarFoto(idx);
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
