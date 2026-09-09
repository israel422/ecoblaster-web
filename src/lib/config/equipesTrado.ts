// Equipes que trabalham com trado e bits diamantado. "equipe" (cidade) é o
// identificador salvo no banco — não muda mesmo que o responsável mude.
export interface EquipeTrado {
  cidade: string;
  responsavel: string;
}

export const EQUIPES_TRADO: EquipeTrado[] = [
  { cidade: "Serra Talhada", responsavel: "Cícero Peixoto" },
  { cidade: "Ouricuri", responsavel: "Rene" },
  { cidade: "Petrolina", responsavel: "Sivaldo" },
];
