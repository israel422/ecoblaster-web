import { describe, expect, it } from "vitest";
import { tiposPermitidos, CATEGORIA_TIPOS, TIPOS_CAVA } from "./tiposCava";

describe("tiposPermitidos", () => {
  it("Blaster só vê Blaster", () => {
    expect(tiposPermitidos("Blaster")).toEqual(["Blaster"]);
  });

  it("Compressor só vê Rompedor e Cava Furada", () => {
    expect(tiposPermitidos("Compressor")).toEqual(["Rompedor", "Cava Furada"]);
  });

  it("Retroescavadeira vê os 4 tipos de terra, incluindo Limpeza de Cava", () => {
    expect(tiposPermitidos("Retroescavadeira")).toEqual([
      "Cava Normal",
      "Cava em Rocha",
      "Cava Iniciada",
      "Limpeza de Cava",
    ]);
  });

  it("admin (categoria null) vê todos os tipos existentes", () => {
    expect(tiposPermitidos(null)).toEqual(TIPOS_CAVA.map((t) => t.id));
  });

  it("toda categoria em CATEGORIA_TIPOS só referencia tipos que existem em TIPOS_CAVA", () => {
    const idsValidos = new Set(TIPOS_CAVA.map((t) => t.id));
    for (const tipos of Object.values(CATEGORIA_TIPOS)) {
      for (const tipo of tipos) {
        expect(idsValidos.has(tipo)).toBe(true);
      }
    }
  });
});
