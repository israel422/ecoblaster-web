import type { Categoria } from "./operadores";

export interface TipoCavaOpcao {
  id: string;
  emoji: string;
}

export const TIPOS_CAVA: TipoCavaOpcao[] = [
  { id: "Cava Normal", emoji: "⛏️" },
  { id: "Cava em Rocha", emoji: "🪨" },
  { id: "Blaster", emoji: "💥" },
  { id: "Rompedor", emoji: "🔨" },
  { id: "Cava Iniciada", emoji: "🚧" },
  { id: "Cava Furada", emoji: "🕳️" },
  { id: "Limpeza de Cava", emoji: "🧹" },
];

export const CATEGORIA_TIPOS: Record<Categoria, string[]> = {
  Blaster: ["Blaster"],
  Compressor: ["Rompedor", "Cava Furada"],
  Retroescavadeira: ["Cava Normal", "Cava em Rocha", "Cava Iniciada", "Limpeza de Cava"],
};

// Admin (categoria null) vê todos os tipos; operador vê só os da própria categoria.
export function tiposPermitidos(categoria: Categoria | null): string[] {
  if (!categoria) return TIPOS_CAVA.map((t) => t.id);
  return CATEGORIA_TIPOS[categoria] ?? [];
}
