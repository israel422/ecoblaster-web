import { z } from "zod";

export const fotoItemSchema = z.object({
  cava: z.number().int().positive(),
  fotoNum: z.number().int().positive(),
  label: z.string().min(1),
  url: z.string().url(),
});

export const registroSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  obra: z.string().min(1),
  tipoCava: z.string().min(1),
  totalCavas: z.coerce.number().int().positive(),
  operador: z.string().min(1),
  cpf: z.string().regex(/^\d{11}$/),
  observacao: z.string().optional().default(""),
  fotos: z.array(fotoItemSchema).min(1),
  turnoServerId: z.string().uuid().optional(),
});

export const acessoSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/),
});

export const turnoAbertoSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/),
  obra: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const encerrarTurnoSchema = z.object({
  encerradoPor: z.string().regex(/^\d{11}$/),
});

export const novaObraSchema = z.object({
  codigo: z.string().trim().min(1).max(30),
  cpf: z.string().regex(/^\d{11}$/),
});

export const observacaoTurnoSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/),
  observacao: z.string().optional().default(""),
});

export const corrigirTipoCavaSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/),
  tipoCava: z.string().min(1),
});

export const pushSubscriptionSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
