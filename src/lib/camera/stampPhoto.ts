export interface DadosCarimbo {
  dataHoraStr: string;
  obra: string;
  tipoCava: string;
  cava: number;
  label: string;
  operador: string;
  gpsStr: string;
}

// Redimensiona pra no máximo 1280px, desenha a faixa de carimbo (data/hora, obra,
// tipo+cava, descrição da foto, GPS, operador) e comprime como JPEG 0.72.
export function stampPhoto(file: File, dados: DadosCarimbo): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.width;
        let h = img.height;
        if (w > MAX) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        }
        if (h > MAX) {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas não suportado"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const fs = Math.max(14, Math.round(w / 42));
        const lh = Math.round(fs * 1.75);
        const barH = lh * 5 + 16;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, h - barH, w, barH);
        const y = h - barH + lh;
        ctx.textBaseline = "alphabetic";

        ctx.font = `bold ${Math.round(fs * 1.2)}px sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(dados.dataHoraStr, 12, y);

        ctx.font = `bold ${fs}px sans-serif`;
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`Obra: ${dados.obra} | ${dados.tipoCava} | Cava ${dados.cava}`, 12, y + lh);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(dados.label, 12, y + lh * 2);

        ctx.font = `${fs - 2}px sans-serif`;
        ctx.fillStyle = "#AAD4FF";
        ctx.fillText(dados.gpsStr, 12, y + lh * 3);

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "right";
        ctx.fillText("EcoBlaster", w - 12, y + lh * 3);
        ctx.textAlign = "left";

        ctx.font = `${fs}px sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`Operador: ${dados.operador}`, 12, y + lh * 4);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Falha ao gerar imagem"));
          },
          "image/jpeg",
          0.6
        );
      };
      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export function formatarDataHora(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
