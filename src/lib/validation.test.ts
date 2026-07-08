import { describe, expect, it } from "vitest";
import { registroSchema, acessoSchema, turnoAbertoSchema } from "./validation";

describe("registroSchema", () => {
  const base = {
    data: "2026-07-08",
    obra: "470213",
    tipoCava: "Blaster",
    totalCavas: 1,
    operador: "LEONARDO MATOS DE OLIVEIRA",
    cpf: "41278286845",
    fotos: [{ cava: 1, fotoNum: 1, label: "Antes", url: "https://exemplo.com/f.jpg" }],
  };

  it("aceita um registro válido", () => {
    expect(registroSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita CPF com menos de 11 dígitos", () => {
    expect(registroSchema.safeParse({ ...base, cpf: "123" }).success).toBe(false);
  });

  it("rejeita data fora do formato yyyy-mm-dd", () => {
    expect(registroSchema.safeParse({ ...base, data: "08/07/2026" }).success).toBe(false);
  });

  it("rejeita sem nenhuma foto", () => {
    expect(registroSchema.safeParse({ ...base, fotos: [] }).success).toBe(false);
  });

  it("rejeita foto com url inválida", () => {
    expect(registroSchema.safeParse({ ...base, fotos: [{ cava: 1, fotoNum: 1, label: "x", url: "não-é-url" }] }).success).toBe(
      false
    );
  });

  it("observacao é opcional", () => {
    const parsed = registroSchema.safeParse(base);
    expect(parsed.success && parsed.data.observacao).toBe("");
  });

  it("aceita totalCavas como string numérica (coerção)", () => {
    expect(registroSchema.safeParse({ ...base, totalCavas: "3" }).success).toBe(true);
  });
});

describe("acessoSchema / turnoAbertoSchema", () => {
  it("acessoSchema aceita CPF de 11 dígitos", () => {
    expect(acessoSchema.safeParse({ cpf: "41278286845" }).success).toBe(true);
  });

  it("turnoAbertoSchema exige obra e data", () => {
    expect(turnoAbertoSchema.safeParse({ cpf: "41278286845", obra: "470213", data: "2026-07-08" }).success).toBe(true);
    expect(turnoAbertoSchema.safeParse({ cpf: "41278286845", obra: "", data: "2026-07-08" }).success).toBe(false);
  });
});
