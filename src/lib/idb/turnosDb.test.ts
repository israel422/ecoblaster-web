import { describe, expect, it } from "vitest";
import { turnoCompleto, fotosFeitas, type TurnoRegistro } from "./turnosDb";
import type { FotoItem } from "@/types";

function turnoComFotos(fotos: FotoItem[]): Pick<TurnoRegistro, "fotos"> {
  return { fotos };
}

const fotoBlob = { blob: new Blob(["x"]) };

describe("turnoCompleto / fotosFeitas", () => {
  it("turno sem nenhuma foto tirada não está completo", () => {
    const turno = turnoComFotos([
      { cava: 1, fotoNum: 1, label: "a" },
      { cava: 1, fotoNum: 2, label: "b" },
    ]);
    expect(turnoCompleto(turno)).toBe(false);
    expect(fotosFeitas(turno)).toBe(0);
  });

  it("turno com algumas fotos tiradas não está completo", () => {
    const turno = turnoComFotos([
      { cava: 1, fotoNum: 1, label: "a", ...fotoBlob },
      { cava: 1, fotoNum: 2, label: "b" },
    ]);
    expect(turnoCompleto(turno)).toBe(false);
    expect(fotosFeitas(turno)).toBe(1);
  });

  it("turno com todas as fotos tiradas está completo", () => {
    const turno = turnoComFotos([
      { cava: 1, fotoNum: 1, label: "a", ...fotoBlob },
      { cava: 1, fotoNum: 2, label: "b", ...fotoBlob },
    ]);
    expect(turnoCompleto(turno)).toBe(true);
    expect(fotosFeitas(turno)).toBe(2);
  });

  it("turno sem nenhuma foto exigida não é considerado completo (evita falso-positivo)", () => {
    expect(turnoCompleto(turnoComFotos([]))).toBe(false);
  });
});
