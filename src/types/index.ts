import type { Categoria } from "@/lib/config/operadores";

export interface SessaoOperador {
  cpf: string;
  nome: string;
  categoria: Categoria | null;
  admin: boolean;
}

export interface FotoItem {
  cava: number;
  /** Tipo de cava dessa cava específica — pode variar dentro do mesmo turno
   *  (ex: cava 1 é Cava em Rocha, cava 2 é Cava Normal). Não confiar em
   *  DadosRegistro.tipoCava pra registrar uma cava já fechada, ele só reflete
   *  a seleção mais recente. */
  tipoCava: string;
  fotoNum: number;
  label: string;
  /** Blob local da foto já carimbada (guardado no IndexedDB). Ausente = ainda não tirada. */
  blob?: Blob;
  /** Preenchido depois do upload bem-sucedido pro Vercel Blob. */
  uploadedUrl?: string;
}

export interface DadosRegistro {
  obra: string;
  data: string; // yyyy-mm-dd
  tipoCava: string;
  observacao: string;
}
