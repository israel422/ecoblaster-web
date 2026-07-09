// Perfil de cor/textura da foto de referência ("2. Foto Resultante" de
// Antes de explorar o solo.png — chão visto de cima), medido uma vez a partir
// da imagem original e usado como base de comparação. Não é uma regra fixa
// pra um único caso (ex: "é céu") — combina diferença de brilho, de tom de
// cor e de textura, e só rejeita quando mais de um sinal aponta pra uma foto
// muito diferente do esperado.
const REF_BRILHO = 75;
const REF_PROPORCAO = { r: 0.448, g: 0.336, b: 0.216 };
const REF_TEXTURA = 11.4;

interface Estatisticas {
  brilho: number;
  proporcao: { r: number; g: number; b: number };
  textura: number;
}

async function criarBitmap(file: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function calcularEstatisticas(file: File | Blob): Promise<Estatisticas> {
  const bitmap = await criarBitmap(file);
  const TAM = 64;
  const BLOCO = 8;
  const canvas = document.createElement("canvas");
  canvas.width = TAM;
  canvas.height = TAM;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { brilho: REF_BRILHO, proporcao: REF_PROPORCAO, textura: REF_TEXTURA };

  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, TAM, TAM);
  const { data } = ctx.getImageData(0, 0, TAM, TAM);

  let somaR = 0;
  let somaG = 0;
  let somaB = 0;
  const brilhosBloco: number[] = [];

  for (let by = 0; by < TAM; by += BLOCO) {
    for (let bx = 0; bx < TAM; bx += BLOCO) {
      let somaBloco = 0;
      let nBloco = 0;
      for (let y = by; y < by + BLOCO; y++) {
        for (let x = bx; x < bx + BLOCO; x++) {
          const i = (y * TAM + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          somaR += r;
          somaG += g;
          somaB += b;
          somaBloco += (r + g + b) / 3;
          nBloco++;
        }
      }
      brilhosBloco.push(somaBloco / nBloco);
    }
  }

  const n = TAM * TAM;
  const r = somaR / n;
  const g = somaG / n;
  const b = somaB / n;
  const brilho = (r + g + b) / 3;
  const soma = r + g + b || 1;
  const mediaBlocos = brilhosBloco.reduce((s, v) => s + v, 0) / brilhosBloco.length;
  const variancia = brilhosBloco.reduce((s, v) => s + (v - mediaBlocos) ** 2, 0) / brilhosBloco.length;

  return {
    brilho,
    proporcao: { r: r / soma, g: g / soma, b: b / soma },
    textura: Math.sqrt(variancia),
  };
}

// Compara a foto tirada com o perfil da foto de referência. Fica de propósito
// tolerante (exige mais de um sinal discordando) pra não recusar fotos reais
// de solo que variam de cor/luz — só bloqueia quando a foto é claramente
// incoerente (muito clara, sem textura, ou com tom bem diferente do esperado).
export async function pareceForaDoEsperado(file: File): Promise<boolean> {
  const stats = await calcularEstatisticas(file);

  const diffBrilho = Math.abs(stats.brilho - REF_BRILHO) / 255;
  const diffTom = Math.sqrt(
    (stats.proporcao.r - REF_PROPORCAO.r) ** 2 +
      (stats.proporcao.g - REF_PROPORCAO.g) ** 2 +
      (stats.proporcao.b - REF_PROPORCAO.b) ** 2
  );
  const semTextura = stats.textura < REF_TEXTURA * 0.35;

  if (stats.brilho > 215) return true;
  if (semTextura && diffBrilho > 0.15) return true;
  if (diffTom > 0.32 && diffBrilho > 0.22) return true;

  return false;
}
