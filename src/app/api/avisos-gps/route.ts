import { NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";
import { chaveObra, distanciaKm, LIMITE_LONGE_KM, MOTIVO_GPS, ORIGEM_GPS, todasCoordenadas } from "@/lib/obras/coordenadaCronograma";

type Foto = { label?: string; gpsFonte?: string; gpsErro?: string; lat?: number; lon?: number; gpsCorrigido?: string };

// Turnos (operador + obra + dia) com problema de localização:
//  - foto que não pegou o GPS normal do celular (com a origem da coordenada usada e o motivo);
//  - foto com GPS do celular a mais de 3 km da coordenada da obra no Cronograma ("longe da obra"),
//    que o admin pode corrigir para a coordenada do Cronograma (POST /api/avisos-gps/corrigir).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!isAdmin(searchParams.get("cpf") || "")) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const dias = Math.min(90, Math.max(1, Number(searchParams.get("dias")) || 30));
  const desde = new Date(Date.now() - dias * 86400_000).toISOString().slice(0, 10);
  const [linhas, { obras }] = await Promise.all([
    db
      .select({ id: registros.id, data: registros.data, obra: registros.obra, operador: registros.operador,
        turnoId: registros.turnoId, criadoEm: registros.criadoEm, fotos: registros.fotos })
      .from(registros)
      .where(gte(registros.data, desde))
      .orderBy(desc(registros.criadoEm)),
    todasCoordenadas(),
  ]);

  const grupos = new Map<string, { data: string; obra: string; operador: string; fotosPlanilha: number; fotosSemNada: number; fotos: number;
    motivos: Record<string, number>; origens: Record<string, number>; ultimoEm: string;
    fotosLonge: number; kmLonge: number; fotosCorrigidas: number; registroIds: number[]; temCronograma: boolean }>();
  for (const l of linhas) {
    const k = `${l.turnoId ?? l.id}|${l.obra}`;
    const c = obras[chaveObra(l.obra)];
    const obraC = c ? { lat: c[0], lon: c[1] } : null;
    const g = grupos.get(k) ?? { data: String(l.data), obra: l.obra, operador: l.operador, fotosPlanilha: 0, fotosSemNada: 0, fotos: 0,
      motivos: {}, origens: {}, ultimoEm: l.criadoEm.toISOString(), fotosLonge: 0, kmLonge: 0, fotosCorrigidas: 0, registroIds: [], temCronograma: !!obraC };
    g.registroIds.push(l.id);
    for (const f of (l.fotos as Foto[]) ?? []) {
      g.fotos++;
      if (f.gpsCorrigido) {
        g.fotosCorrigidas++;
        continue;
      }
      // GPS do celular longe da obra no Cronograma
      if (obraC && f.lat != null && f.lon != null && f.gpsFonte !== "planilha") {
        const km = distanciaKm({ lat: f.lat, lon: f.lon }, obraC);
        if (km > LIMITE_LONGE_KM) {
          g.fotosLonge++;
          g.kmLonge = Math.max(g.kmLonge, Math.round(km * 10) / 10);
        }
      }
      // fotos antigas (antes da correção de 22/10) já completadas com a melhor coordenada: não é mais problema
      if (f.gpsErro === "app_antigo" && f.lat != null) continue;
      if (f.lat == null) g.fotosSemNada++;
      else if (f.gpsFonte) {
        g.fotosPlanilha++;
        const o = ORIGEM_GPS[f.gpsFonte] ?? f.gpsFonte;
        g.origens[o] = (g.origens[o] ?? 0) + 1;
      } else continue;
      const m = MOTIVO_GPS[f.gpsErro ?? ""] ?? "GPS não respondeu (app antigo)";
      g.motivos[m] = (g.motivos[m] ?? 0) + 1;
    }
    grupos.set(k, g);
  }
  return NextResponse.json(
    [...grupos.values()]
      .filter((g) => g.fotosPlanilha + g.fotosSemNada + g.fotosLonge + g.fotosCorrigidas > 0)
      .sort((a, b) => b.ultimoEm.localeCompare(a.ultimoEm))
  );
}
