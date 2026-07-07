export type Categoria = "Blaster" | "Compressor" | "Retroescavadeira";

export interface Operador {
  cpf: string;
  nome: string;
  categoria: Categoria | null; // admin não tem categoria (vê todos os tipos de cava)
  admin: boolean;
}

// Fonte única da verdade: usada tanto no cliente (wizard, filtro de tipo de cava)
// quanto no servidor (validação de admin nas rotas de API) — nunca confiar num
// "isAdmin" vindo do cliente sem checar aqui de novo.
export const OPERADORES: Operador[] = [
  { cpf: "41278286845", nome: "LEONARDO MATOS DE OLIVEIRA", categoria: "Blaster", admin: false },
  { cpf: "10284263486", nome: "LUIZ CARLOS DA SILVA SOBRINHO", categoria: "Compressor", admin: false },
  { cpf: "04917892546", nome: "JOSSIEL MARTINS MESQUITA", categoria: "Compressor", admin: false },
  { cpf: "70690623461", nome: "GABRIEL FERREIRA DOS SANTOS", categoria: "Retroescavadeira", admin: false },
  { cpf: "02897981598", nome: "IRAILDO DA CRUZ REIS", categoria: "Retroescavadeira", admin: false },
  { cpf: "13579062425", nome: "JAILSON ALVES DA SILVA", categoria: "Retroescavadeira", admin: false },
  { cpf: "11799082440", nome: "GHERMERSON PEREIRA BARBOSA", categoria: "Retroescavadeira", admin: false },
  { cpf: "12497946418", nome: "DIOGO AMANDO DE OLIVEIRA", categoria: "Retroescavadeira", admin: false },
  { cpf: "07658074403", nome: "ANTONIO CARLOS DA SILVA", categoria: "Retroescavadeira", admin: false },
  { cpf: "70239725441", nome: "ISRAEL IURY JACINTO DE SOUZA", categoria: null, admin: true },
];

export function buscarOperador(cpf: string): Operador | undefined {
  return OPERADORES.find((o) => o.cpf === cpf);
}

export function isAdmin(cpf: string): boolean {
  return buscarOperador(cpf)?.admin ?? false;
}
