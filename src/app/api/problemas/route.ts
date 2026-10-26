import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/config/operadores";
import { listarProblemas, registrarProblema, TIPOS, type TipoProblema } from "@/lib/problemas/servidor";

// O app avisa um problema (celular do operador). Sem login de servidor: só tipos conhecidos e textos curtos.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { cpf?: string; tipo?: string; chave?: string; detalhe?: Record<string, unknown> } | null;
  const tipo = b?.tipo as TipoProblema;
  const cpf = String(b?.cpf ?? "").replace(/\D/g, "").slice(0, 11);
  if (!TIPOS.includes(tipo) || !cpf) return NextResponse.json({ erro: "inválido" }, { status: 400 });
  const bruto = b?.detalhe && typeof b.detalhe === "object" ? b.detalhe : {};
  const texto = JSON.stringify(bruto);
  const detalhe = texto.length > 3000 ? { resumo: texto.slice(0, 3000) } : bruto;
  await registrarProblema(tipo, cpf, String(b?.chave ?? "").slice(0, 120), detalhe);
  return NextResponse.json({ ok: true });
}

// Central de Problemas (só administrador)
export async function GET(req: Request) {
  if (!isAdmin(new URL(req.url).searchParams.get("cpf") || "")) return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  return NextResponse.json(await listarProblemas());
}
