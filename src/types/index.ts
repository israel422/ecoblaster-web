import type { Categoria } from "@/lib/config/operadores";

export interface SessaoOperador {
  cpf: string;
  nome: string;
  categoria: Categoria | null;
  admin: boolean;
}

export interface FotoItem {
  cava: number;
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
