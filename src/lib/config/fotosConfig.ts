// Fotos obrigatórias por tipo de cava, na ordem em que devem ser tiradas.
export const FOTOS_CONFIG: Record<string, string[]> = {
  "Cava Normal": [
    "Antes de explorar o solo",
    "Durante a exploracao",
    "Cava pronta",
    "Cava pronta com trena medindo a largura",
    "Cava pronta com trena medindo a profundidade",
  ],
  "Cava em Rocha": [
    "Antes de explorar o solo",
    "Durante a exploracao",
    "Cava pronta",
    "Cava pronta com trena medindo a largura",
    "Cava pronta com trena medindo a profundidade",
  ],
  Rompedor: [
    "Antes de explorar o solo",
    "Durante a exploracao",
    "Cava pronta",
    "Cava pronta com trena medindo a largura",
    "Cava pronta com trena medindo a profundidade",
  ],
  Blaster: [
    "Antes de realizar detonacao medindo profundidade",
    "Antes da detonacao com estupin aplicado",
  ],
  "Cava Iniciada": ["Antes de explorar o solo", "Durante a exploracao"],
  "Cava Furada": ["Durante a exploracao"],
  "Limpeza de Cava": [
    "Cava pronta",
    "Cava pronta com trena medindo a largura",
    "Cava pronta com trena medindo a profundidade",
  ],
};
