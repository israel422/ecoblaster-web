// Troca só a linha "GPS: ..." do carimbo já gravado numa foto (feito por stampPhoto).
// A geometria do carimbo depende só da largura/altura da imagem, então dá para achar a linha exata:
// apaga a linha antiga pintando cada linha de pixel com a cor do fundo da faixa logo ao lado do texto
// e escreve a coordenada nova com a mesma fonte e cor.
export async function corrigirGpsDoCarimbo(
  foto: Blob,
  antigo: { lat: number; lon: number },
  novo: { lat: number; lon: number }
): Promise<Blob> {
  const img = await createImageBitmap(foto);
  const w = img.width;
  const h = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas não suportado");
  ctx.drawImage(img, 0, 0);

  // mesmas contas do stampPhoto
  const fs = Math.max(14, Math.round(w / 42));
  const lh = Math.round(fs * 1.75);
  const barH = lh * 5 + 16;
  const base = h - barH + lh + lh * 3; // linha de base do texto do GPS
  const fonte = `${fs - 2}px sans-serif`;
  ctx.font = fonte;

  // área do texto antigo (com folga: a fonte do celular que carimbou pode ser um pouco mais larga)
  const textoAntigo = `GPS: ${antigo.lat.toFixed(5)}, ${antigo.lon.toFixed(5)}`;
  const textoNovo = `GPS: ${novo.lat.toFixed(5)}, ${novo.lon.toFixed(5)}`;
  const larg = Math.max(ctx.measureText(textoAntigo).width, ctx.measureText(textoNovo).width);
  const x0 = 4;
  const x1 = Math.min(Math.round(12 + larg * 1.2 + 14), Math.round(w * 0.62));
  const y0 = Math.round(base - fs * 1.0);
  const y1 = Math.round(base + fs * 0.38);

  // cor de fundo de cada linha de pixel: média de uma faixa logo à direita do texto
  const amostraX0 = x1 + 6;
  const amostraW = Math.max(8, Math.min(60, w - amostraX0 - Math.round(w * 0.3)));
  const amostra = ctx.getImageData(amostraX0, y0, amostraW, y1 - y0).data;
  const area = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  for (let y = 0; y < y1 - y0; y++) {
    let r = 0, g = 0, b = 0;
    for (let x = 0; x < amostraW; x++) {
      const i = (y * amostraW + x) * 4;
      r += amostra[i];
      g += amostra[i + 1];
      b += amostra[i + 2];
    }
    r /= amostraW;
    g /= amostraW;
    b /= amostraW;
    for (let x = 0; x < x1 - x0; x++) {
      const i = (y * (x1 - x0) + x) * 4;
      area.data[i] = r;
      area.data[i + 1] = g;
      area.data[i + 2] = b;
    }
  }
  ctx.putImageData(area, x0, y0);

  ctx.font = fonte;
  ctx.fillStyle = "#AAD4FF";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(textoNovo, 12, base);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/jpeg", 0.85)
  );
}
