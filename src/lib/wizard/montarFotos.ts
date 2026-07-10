import { FOTOS_CONFIG } from "@/lib/config/fotosConfig";
import type { FotoItem } from "@/types";

// Monta a lista de fotos exigidas pra uma única cava, na ordem em que devem
// ser tiradas, com base no tipo de cava. O turno registra cava por cava — pra
// adicionar outra cava ao mesmo turno, chama de novo com o próximo número.
export function montarFotosParaCava(tipoCava: string, cava: number): FotoItem[] {
  const config = FOTOS_CONFIG[tipoCava] || [];
  return config.map((label, i) => ({ cava, fotoNum: i + 1, label }));
}
