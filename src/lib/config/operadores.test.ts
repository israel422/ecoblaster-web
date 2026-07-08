import { describe, expect, it } from "vitest";
import { buscarOperador, isAdmin, OPERADORES } from "./operadores";

describe("buscarOperador / isAdmin", () => {
  it("acha um operador existente pelo CPF", () => {
    const op = buscarOperador("41278286845");
    expect(op?.nome).toBe("LEONARDO MATOS DE OLIVEIRA");
    expect(op?.categoria).toBe("Blaster");
  });

  it("retorna undefined pra CPF desconhecido", () => {
    expect(buscarOperador("00000000000")).toBeUndefined();
  });

  it("só o Israel é admin", () => {
    expect(isAdmin("70239725441")).toBe(true);
    expect(isAdmin("41278286845")).toBe(false);
    expect(isAdmin("00000000000")).toBe(false);
  });

  it("todos os CPFs têm 11 dígitos numéricos", () => {
    for (const op of OPERADORES) {
      expect(op.cpf).toMatch(/^\d{11}$/);
    }
  });

  it("não tem CPF duplicado na lista", () => {
    const cpfs = OPERADORES.map((o) => o.cpf);
    expect(new Set(cpfs).size).toBe(cpfs.length);
  });
});
