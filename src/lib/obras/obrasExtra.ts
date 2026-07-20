// Obras adicionadas via painel do admin (além da lista base embutida em
// src/lib/config/obras.ts). Como o service worker nunca cacheia /api/*, aqui
// guardamos a última lista conhecida em localStorage pra funcionar offline.
const CHAVE = "ecoblaster_obras_extra";

export function lerObrasExtraCache(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAVE);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function atualizarObrasExtraCache(): Promise<string[]> {
  try {
    const resp = await fetch("/api/obras");
    if (!resp.ok) return lerObrasExtraCache();
    const lista = (await resp.json()) as string[];
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    return lista;
  } catch {
    return lerObrasExtraCache();
  }
}
