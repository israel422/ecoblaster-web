import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";
import { coordenadaDaObra, distanciaKm, LIMITE_LONGE_KM } from "@/lib/obras/coordenadaCronograma";

type Foto = { url?: string; lat?: number; lon?: number; gpsFonte?: string; gpsCorrigido?: string; gpsOriginal?: unknown };

// Botão "Usar coordenada do cronograma" dos Avisos de GPS: troca a coordenada das fotos que estão a mais
// de 3 km da obra pela coordenada da obra no Cronograma. A coordenada original fica guardada em gpsOriginal.
// Devolve as fotos trocadas: o navegador do admin reescreve a linha do GPS no carimbo e salva em /carimbo.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { cpf?: string; ids?: unknown } | null;
  if (!isAdmin(body?.cpf || "")) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const ids = Array.isArray(body?.ids) ? body.ids.filter((i): i is number => Number.isInteger(i)).slice(0, 500) : [];
  if (!ids.length) return NextResponse.json({ erro: "Nenhum registro" }, { status: 400 });

  const linhas = await db.select({ id: registros.id, obra: registros.obra, fotos: registros.fotos }).from(registros).where(inArray(registros.id, ids));
  const em = new Date().toISOString();
  let corrigidas = 0;
  const paraCarimbo: { id: number; idx: number; url: string; antigo: { lat: number; lon: number }; novo: { lat: number; lon: number } }[] = [];
  for (const l of linhas) {
    const obraC = await coordenadaDaObra(l.obra);
    if (!obraC) continue;
    let mudou = false;
    const fotos = ((l.fotos as Foto[]) ?? []).map((f, idx) => {
      if (f.gpsCorrigido || f.lat == null || f.lon == null || f.gpsFonte === "planilha") return f;
      if (distanciaKm({ lat: f.lat, lon: f.lon }, obraC) <= LIMITE_LONGE_KM) return f;
      mudou = true;
      corrigidas++;
      if (f.url) paraCarimbo.push({ id: l.id, idx, url: f.url, antigo: { lat: f.lat, lon: f.lon }, novo: obraC });
      return {
        ...f,
        gpsOriginal: { lat: f.lat, lon: f.lon, gpsFonte: f.gpsFonte ?? "celular" },
        lat: obraC.lat,
        lon: obraC.lon,
        gpsFonte: "planilha",
        gpsCorrigido: `longe_obra|${body!.cpf}|${em}`,
      };
    });
    if (mudou) await db.update(registros).set({ fotos }).where(eq(registros.id, l.id));
  }
  return NextResponse.json({ corrigidas, fotos: paraCarimbo });
}
