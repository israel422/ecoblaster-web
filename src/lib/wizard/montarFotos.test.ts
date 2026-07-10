import { describe, expect, it } from "vitest";
import { montarFotosParaCava } from "./montarFotos";

describe("montarFotosParaCava", () => {
  it("Cava Furada gera 1 foto", () => {
    const fotos = montarFotosParaCava("Cava Furada", 1);
    expect(fotos).toEqual([{ cava: 1, fotoNum: 1, label: "Durante a exploracao" }]);
  });

  it("Cava Normal gera 5 fotos, na ordem certa", () => {
    const fotos = montarFotosParaCava("Cava Normal", 1);
    expect(fotos).toHaveLength(5);
    expect(fotos[0]).toEqual({ cava: 1, fotoNum: 1, label: "Antes de explorar o solo" });
    expect(fotos[4]).toEqual({ cava: 1, fotoNum: 5, label: "Cava pronta com trena medindo a profundidade" });
  });

  it("numera a cava certa quando é a segunda ou terceira do turno", () => {
    expect(montarFotosParaCava("Cava Furada", 3)).toEqual([{ cava: 3, fotoNum: 1, label: "Durante a exploracao" }]);
  });

  it("Blaster gera 2 fotos", () => {
    expect(montarFotosParaCava("Blaster", 1)).toHaveLength(2);
  });

  it("tipo desconhecido gera lista vazia em vez de quebrar", () => {
    expect(montarFotosParaCava("Tipo Que Nao Existe", 1)).toEqual([]);
  });
});
