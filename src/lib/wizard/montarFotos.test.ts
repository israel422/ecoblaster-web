import { describe, expect, it } from "vitest";
import { montarFotos } from "./montarFotos";

describe("montarFotos", () => {
  it("Cava Furada com 1 cava gera 1 foto", () => {
    const fotos = montarFotos("Cava Furada", "1");
    expect(fotos).toEqual([{ cava: 1, fotoNum: 1, label: "Durante a exploracao" }]);
  });

  it("Cava Normal com 3 cavas gera 15 fotos (5 por cava), na ordem certa", () => {
    const fotos = montarFotos("Cava Normal", "3");
    expect(fotos).toHaveLength(15);
    expect(fotos[0]).toEqual({ cava: 1, fotoNum: 1, label: "Antes de explorar o solo" });
    expect(fotos[4]).toEqual({ cava: 1, fotoNum: 5, label: "Cava pronta com trena medindo a profundidade" });
    expect(fotos[5]).toEqual({ cava: 2, fotoNum: 1, label: "Antes de explorar o solo" });
  });

  it("Blaster gera 2 fotos por cava", () => {
    const fotos = montarFotos("Blaster", "2");
    expect(fotos).toHaveLength(4);
  });

  it("tipo desconhecido gera lista vazia em vez de quebrar", () => {
    expect(montarFotos("Tipo Que Nao Existe", "3")).toEqual([]);
  });

  it("total de cavas inválido (vazio/texto) assume 1 cava", () => {
    expect(montarFotos("Cava Furada", "")).toHaveLength(1);
    expect(montarFotos("Cava Furada", "abc")).toHaveLength(1);
  });
});
