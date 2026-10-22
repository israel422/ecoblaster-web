import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registros } from "@/lib/db/schema";
import { buscarOperador, isAdmin } from "@/lib/config/operadores";
import { registroSchema } from "@/lib/validation";
import { coordenadaDaObra, MOTIVO_GPS } from "@/lib/obras/coordenadaCronograma";
import { enviarPushParaTodos } from "@/lib/push/enviarPush";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") || "";
  if (!isAdmin(cpf)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const obra = searchParams.get("obra");
  const operador = searchParams.get("operador");
  const tipoCava = searchParams.get("tipoCava");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const condicoes = [];
  if (obra) condicoes.push(ilike(registros.obra, `%${obra}%`));
  if (operador) condicoes.push(ilike(registros.operador, `%${operador}%`));
  if (tipoCava) condicoes.push(eq(registros.tipoCava, tipoCava));
  if (dataInicio) condicoes.push(gte(registros.data, dataInicio));
  if (dataFim) condicoes.push(lte(registros.data, dataFim));

  const resultado =
    condicoes.length > 0
      ? await db.select().from(registros).where(and(...condicoes)).orderBy(desc(registros.criadoEm))
      : await db.select().from(registros).orderBy(desc(registros.criadoEm));

  return NextResponse.json(resultado);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ sucesso: false, erro: "Dados inválidos: " + parsed.error.issues[0]?.message }, { status: 400 });
  }

  const operador = buscarOperador(parsed.data.cpf);
  if (!operador) {
    return NextResponse.json({ sucesso: false, erro: "CPF não autorizado" }, { status: 403 });
  }

  // Em hipótese alguma foto sem coordenada: o que chegar sem GPS recebe a coordenada da obra no
  // Cronograma de Obras (o celular já tenta isso; aqui é a segunda garantia, também para app antigo).
  const fotos = parsed.data.fotos;
  if (fotos.some((f) => f.lat == null || f.lon == null)) {
    const c = await coordenadaDaObra(parsed.data.obra);
    if (c) {
      for (const f of fotos) {
        if (f.lat == null || f.lon == null) Object.assign(f, { lat: c.lat, lon: c.lon, gpsFonte: "planilha", gpsErro: f.gpsErro ?? "sem_sinal" });
      }
    }
  }
  const usouPlanilha = fotos.filter((f) => f.gpsFonte === "planilha");
  const semNada = fotos.filter((f) => f.lat == null || f.lon == null);

  try {
    // avisa uma vez por turno (o turno tem um registro por cava)
    const jaAvisado = parsed.data.turnoServerId && (usouPlanilha.length || semNada.length)
      ? (await db.select({ id: registros.id }).from(registros)
          .where(and(eq(registros.turnoId, parsed.data.turnoServerId), sql`${registros.fotos} @> '[{"gpsFonte":"planilha"}]'::jsonb`)).limit(1)).length > 0
      : false;

    await db.insert(registros).values({
      data: parsed.data.data,
      obra: parsed.data.obra,
      tipoCava: parsed.data.tipoCava,
      totalCavas: parsed.data.totalCavas,
      operador: operador.nome,
      cpf: operador.cpf,
      observacao: parsed.data.observacao,
      fotos,
      turnoId: parsed.data.turnoServerId,
    });

    if (!jaAvisado && (usouPlanilha.length || semNada.length)) {
      const motivo = MOTIVO_GPS[(usouPlanilha[0] ?? semNada[0])?.gpsErro ?? ""] ?? "GPS não respondeu";
      await enviarPushParaTodos(
        semNada.length
          ? { titulo: "⚠️ Foto sem coordenada", corpo: `${operador.nome} · obra ${parsed.data.obra}: ${motivo}, e a obra não tem coordenada no Cronograma de Obras.`, url: "/painel" }
          : { titulo: "📍 Coordenada da planilha", corpo: `${operador.nome} · obra ${parsed.data.obra}: ${motivo}. Usei a coordenada da obra no Cronograma de Obras.`, url: "/painel" }
      ).catch((err) => console.error("Falha no aviso de GPS:", err));
    }

    return NextResponse.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao salvar registro:", err);
    return NextResponse.json({ sucesso: false, erro: "Erro ao salvar no banco de dados" }, { status: 500 });
  }
}
