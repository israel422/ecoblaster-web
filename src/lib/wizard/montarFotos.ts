import { FOTOS_CONFIG } from "@/lib/config/fotosConfig";
import type { FotoItem } from "@/types";

// Monta a lista de fotos exigidas (uma entrada por foto, por cava), na ordem
// em que devem ser tiradas, com base no tipo de cava e no total de cavas.
export function montarFotos(tipoCava: string, totalCavas: string): FotoItem[] {
  const config = FOTOS_CONFIG[tipoCava] || [];
  const total = parseInt(totalCavas, 10) || 1;
  const fotos: FotoItem[] = [];
  for (let c = 1; c <= total; c++) {
    config.forEach((label, i) => {
      fotos.push({ cava: c, fotoNum: i + 1, label });
    });
  }
  return fotos;
}
