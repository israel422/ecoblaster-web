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

// Obras adicionadas pelo admin em tempo de execução, além da lista base
// embutida no código (src/lib/config/obras.ts).
export const obrasAdicionadas = pgTable("obras_adicionadas", {
  codigo: text("codigo").primaryKey(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  criadoPor: text("criado_por").notNull(),
});

// Inscrições de notificação push (Web Push), uma por aparelho/navegador que
// aceitou receber notificações (botão "Ativar notificações" no menu admin).
export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  cpf: text("cpf").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
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
