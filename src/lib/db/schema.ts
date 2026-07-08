import { sql } from "drizzle-orm";
import { pgTable, bigserial, uuid, text, integer, date, timestamp, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const registros = pgTable("registros", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  data: date("data").notNull(),
  obra: text("obra").notNull(),
  tipoCava: text("tipo_cava").notNull(),
  totalCavas: integer("total_cavas").notNull(),
  operador: text("operador").notNull(),
  cpf: text("cpf").notNull(),
  observacao: text("observacao"),
  // [{ cava: number, fotoNum: number, label: string, url: string }]
  fotos: jsonb("fotos").notNull(),
});

export const acessos = pgTable("acessos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  cpf: text("cpf").notNull(),
  operador: text("operador").notNull(),
});

export const turnosAbertos = pgTable(
  "turnos_abertos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cpf: text("cpf").notNull(),
    operador: text("operador").notNull(),
    obra: text("obra").notNull(),
    data: date("data").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    ativo: boolean("ativo").notNull().default(true),
    encerradoEm: timestamp("encerrado_em", { withTimezone: true }),
    encerradoPor: text("encerrado_por"),
  },
  (t) => [
    // só um turno ativo por operador+obra+data ao mesmo tempo
    uniqueIndex("turnos_abertos_ativo_unq")
      .on(t.cpf, t.obra, t.data)
      .where(sql`${t.ativo}`),
  ]
);
