import { NextResponse } from "next/server";
import { and, desc, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";
import { MOTIVO_GPS } from "@/lib/obras/coordenadaCronograma";

type Foto = { label?: string; gpsFonte?: string; gpsErro?: string; lat?: number };

// Registros em que alguma foto ficou sem o GPS do celular e usou a coordenada da obra no
// Cronograma de Obras — agrupados por turno (operador + obra + dia), com o problema que houve.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!isAdmin(searchParams.get("cpf") || "")) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const dias = Math.min(90, Math.max(1, Number(searchParams.get("dias")) || 30));
  const desde = new Date(Date.now() - dias * 86400_000).toISOString().slice(0, 10);
  const linhas = await db
    .select({ id: registros.id, data: registros.data, obra: registros.obra, operador: registros.operador,
      turnoId: registros.turnoId, criadoEm: registros.criadoEm, fotos: registros.fotos })
    .from(registros)
    .where(and(gte(registros.data, desde), sql`(${registros.fotos} @> '[{"gpsFonte":"planilha"}]'::jsonb
      OR jsonb_path_exists(${registros.fotos}, '$[*] ? (!exists(@.lat))'))`))
    .orderBy(desc(registros.criadoEm));

  const grupos = new Map<string, { data: string; obra: string; operador: string; fotosPlanilha: number; fotosSemNada: number; fotos: number;
    motivos: Record<string, number>; ultimoEm: string }>();
  for (const l of linhas) {
    const k = `${l.turnoId ?? l.id}|${l.obra}`;
    const g = grupos.get(k) ?? { data: String(l.data), obra: l.obra, operador: l.operador, fotosPlanilha: 0, fotosSemNada: 0, fotos: 0, motivos: {}, ultimoEm: l.criadoEm.toISOString() };
    for (const f of (l.fotos as Foto[]) ?? []) {
      g.fotos++;
      if (f.gpsFonte === "planilha") g.fotosPlanilha++;
      else if (f.lat == null) g.fotosSemNada++;
      else continue;
      const m = MOTIVO_GPS[f.gpsErro ?? ""] ?? "GPS não respondeu (app antigo)";
      g.motivos[m] = (g.motivos[m] ?? 0) + 1;
    }
    grupos.set(k, g);
  }
  return NextResponse.json([...grupos.values()].sort((a, b) => b.ultimoEm.localeCompare(a.ultimoEm)));
}
