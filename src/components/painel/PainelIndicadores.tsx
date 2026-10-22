"use client";

import { useEffect, useState } from "react";
import { TIPOS_CAVA } from "@/lib/config/tiposCava";
import { OPERADORES, OPERADORES_EXCLUIDOS_INDICADORES } from "@/lib/config/operadores";
import { MOTIVOS_JUSTIFICATIVA } from "@/lib/config/motivosJustificativa";

interface RegistroLinha {
  id: number;
  data: string;
  obra: string;
  tipoCava: string;
  totalCavas: number;
  operador: string;
  fotos: unknown[];
}

interface LinhaAgregada {
  chave: string;
  registros: number;
  cavas: number;
  fotos: number;
  obras: number; // obras diferentes
  dias: number; // dias com pelo menos um registro
  mediaDia: number; // cavas ÷ dias com registro
}

const fmtMedia = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Ícones (traço) usados nos cartões e títulos do painel.
const ICONES: Record<string, string> = {
  grafico: "M3 3v18h18 M7 15l4-4 3 3 6-6",
  registros: "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 12h6 M9 16h6",
  cava: "M2 21h12 M5 15h7a2 2 0 0 1 0 4H5a2 2 0 0 1 0-4z M7 15v-3h4l2 3 M12 12l5-7 4 3 M21 8l-1 6h-3",
  foto: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  obra: "M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5 M4 15v-3a6 6 0 0 1 6-6 M14 6a6 6 0 0 1 6 6v3",
  media: "M9 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z M3 16V5a2 2 0 0 1 2-2h11 M21 17l-4-4-6 6 M12.5 11.5h.01",
  calendario: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18 M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01",
  relogio: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",
  pessoas: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  busca: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.3-4.3",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  alerta: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4 M12 16h.01",
  ok: "M22 11.1V12a10 10 0 1 1-5.9-9.1 M22 4 12 14l-3-3",
  trado: "M12 2v5 M8 7h8l-2 4h-4z M12 11v11 M10 14l4 2 M10 18l4 2",
  lista: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
};

function Ico({ nome }: { nome: keyof typeof ICONES }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONES[nome]} />
    </svg>
  );
}

// Cores das barras, na ordem da arte (verde, verde-claro, laranja, roxo, vermelho...): [barra, texto do número]
const CORES_BARRA: [string, string][] = [
  ["#1d7a4c", "#1d7a4c"],
  ["#5cc46a", "#2f8a3f"],
  ["#f7891f", "#c4610a"],
  ["#9b3fe0", "#7a26bd"],
  ["#dc1f3a", "#b5172e"],
  ["#14a3b8", "#0d7d8e"],
  ["#e52592", "#b81c74"],
  ["#8d6e63", "#6d4c41"],
];

function Kpi({
  icone, valor, extra, rotulo, cor, fundo, title, alerta,
}: { icone: keyof typeof ICONES; valor: React.ReactNode; extra?: React.ReactNode; rotulo: string; cor: string; fundo: string; title?: string; alerta?: boolean }) {
  return (
    <div className="ind-kpi" style={{ "--cor": cor, "--fundo": fundo } as React.CSSProperties} title={title}>
      <span className="ind-kpi-ico"><Ico nome={icone} /></span>
      <div>
        <div className="ind-kpi-valor" style={alerta ? { color: "#d93025" } : undefined}>
          {valor}
          {extra ? <small> {extra}</small> : null}
        </div>
        <div className="ind-kpi-rotulo">{rotulo}</div>
        <span className="ind-kpi-traco" />
      </div>
    </div>
  );
}

function Secao({ icone, titulo, extra, descricao, children }: { icone: keyof typeof ICONES; titulo: string; extra?: React.ReactNode; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="ind-secao">
      <h3 className="ind-h3">
        <Ico nome={icone} />
        {titulo}
        {extra ? <span className="ind-h3-extra">{extra}</span> : null}
      </h3>
      {descricao && <p className="ind-desc">{descricao}</p>}
      {children}
    </section>
  );
}

// Barras horizontais com o número num selo logo depois da barra (como na arte).
function Barras({ itens, vazio = "Sem dados no período." }: { itens: { rotulo: string; valor: number; texto?: string; title?: string }[]; vazio?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  if (itens.length === 0) return <p className="ind-vazio">{vazio}</p>;
  return (
    <div className="ind-barras">
      {itens.map((it, i) => {
        const [cor, texto] = CORES_BARRA[i % CORES_BARRA.length];
        return (
          <div key={it.rotulo} className="ind-barra-linha" title={it.title ?? `${it.rotulo}: ${it.texto ?? it.valor}`}>
            <span className="ind-barra-rotulo">{it.rotulo}</span>
            <span className="ind-barra-trilho">
              <span className="ind-barra" style={{ width: `${Math.max(1.5, (it.valor / max) * 90)}%`, background: cor }} />
              <span className="ind-selo" style={{ color: texto, background: `${cor}2b` }}>{it.texto ?? it.valor}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Barras empilhadas (um segmento por categoria), com legenda e o total no selo.
function BarrasEmpilhadas({
  linhas, categorias, cores, vazio = "Sem dados no período.",
}: { linhas: { rotulo: string; total: number; partes: Record<string, number> }[]; categorias: string[]; cores: Record<string, string>; vazio?: string }) {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  const presentes = categorias.filter((c) => linhas.some((l) => l.partes[c]));
  if (linhas.every((l) => l.total === 0)) return <p className="ind-vazio">{vazio}</p>;
  return (
    <div>
      <div className="ind-legenda">
        {presentes.map((c) => (
          <span key={c}>
            <i style={{ background: cores[c] ?? "#999" }} />
            {c}
          </span>
        ))}
      </div>
      <div className="ind-barras">
        {linhas.map((l) => (
          <div key={l.rotulo} className="ind-barra-linha">
            <span className="ind-barra-rotulo">{l.rotulo}</span>
            <span className="ind-barra-trilho">
              <span className="ind-barra ind-pilha" style={{ width: `${Math.max(l.total ? 1.5 : 0, (l.total / max) * 90)}%` }}>
                {presentes.map((c) =>
                  l.partes[c] ? <span key={c} title={`${c}: ${l.partes[c]}`} style={{ flexGrow: l.partes[c], background: cores[c] ?? "#999" }} /> : null
                )}
              </span>
              <span className="ind-selo" style={{ color: "#0f3b3c", background: "#e6efeb" }}>{l.total}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function agregarPor(lista: RegistroLinha[], campo: "operador" | "tipoCava" | "obra"): LinhaAgregada[] {
  const mapa = new Map<string, LinhaAgregada & { _obras: Set<string>; _dias: Set<string> }>();
  for (const r of lista) {
    const chave = r[campo];
    const atual = mapa.get(chave) || {
      chave, registros: 0, cavas: 0, fotos: 0, obras: 0, dias: 0, mediaDia: 0, _obras: new Set<string>(), _dias: new Set<string>(),
    };
    atual.registros += 1;
    atual.cavas += r.totalCavas;
    atual.fotos += r.fotos.length;
    atual._obras.add(r.obra);
    atual._dias.add(r.data);
    mapa.set(chave, atual);
  }
  return Array.from(mapa.values())
    .map(({ _obras, _dias, ...l }) => ({ ...l, obras: _obras.size, dias: _dias.size, mediaDia: _dias.size ? l.cavas / _dias.size : 0 }))
    .sort((a, b) => b.cavas - a.cavas);
}

interface ObraPorTipo {
  obra: string;
  totalCavas: number;
  porTipo: Record<string, number>;
}

function agregarObraPorTipo(lista: RegistroLinha[]): ObraPorTipo[] {
  const mapa = new Map<string, ObraPorTipo>();
  for (const r of lista) {
    const atual = mapa.get(r.obra) || { obra: r.obra, totalCavas: 0, porTipo: {} };
    atual.totalCavas += r.totalCavas;
    atual.porTipo[r.tipoCava] = (atual.porTipo[r.tipoCava] || 0) + r.totalCavas;
    mapa.set(r.obra, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.totalCavas - a.totalCavas);
}

interface MediaCavas {
  chave: string;
  totalCavas: number;
  dias: number;
  mediaPorDia: number;
}

function agregarMediaCavaPor(lista: RegistroLinha[], campo: "obra" | "operador"): MediaCavas[] {
  const mapa = new Map<string, { totalCavas: number; dias: Set<string> }>();
  for (const r of lista) {
    const chave = r[campo];
    const atual = mapa.get(chave) || { totalCavas: 0, dias: new Set<string>() };
    atual.totalCavas += r.totalCavas;
    atual.dias.add(r.data);
    mapa.set(chave, atual);
  }
  return Array.from(mapa.entries())
    .map(([chave, v]) => ({
      chave,
      totalCavas: v.totalCavas,
      dias: v.dias.size,
      mediaPorDia: v.dias.size > 0 ? v.totalCavas / v.dias.size : 0,
    }))
    .sort((a, b) => b.mediaPorDia - a.mediaPorDia);
}

function TabelaMediaCavas({ titulo, colunaChave, descricao, linhas }: { titulo: string; colunaChave: string; descricao: string; linhas: MediaCavas[] }) {
  return (
    <Secao icone="media" titulo={titulo} descricao={descricao}>
      <div className="ind-tabela">
        <table>
          <thead>
            <tr>
              <th>{colunaChave}</th>
              <th>Cavas</th>
              <th>Dias trabalhados</th>
              <th>Média de cavas/dia</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave}>
                <td>{l.chave}</td>
                <td>{l.totalCavas}</td>
                <td>{l.dias}</td>
                <td><span className="ind-pill">{fmtMedia(l.mediaPorDia)}</span></td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={4}>Sem dados no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Secao>
  );
}

const CORES_TIPO: Record<string, string> = {
  "Cava Normal": "#1f8a4c",
  "Cava em Rocha": "#e8710a",
  Blaster: "#d93025",
  Rompedor: "#795548",
  "Cava Iniciada": "#9334e6",
  "Cava Furada": "#12939a",
  "Limpeza de Cava": "#2f9e4b",
};

function GraficoBarrasEmpilhadasPorTipo({ linhas }: { linhas: ObraPorTipo[] }) {
  return (
    <BarrasEmpilhadas
      linhas={linhas.map((l) => ({ rotulo: l.obra, total: l.totalCavas, partes: l.porTipo }))}
      categorias={TIPOS_CAVA.map((t) => t.id)}
      cores={CORES_TIPO}
    />
  );
}

function TabelaAgregada({
  titulo, colunaChave, linhas, diasPeriodo, icone,
}: { titulo: string; colunaChave: string; linhas: LinhaAgregada[]; diasPeriodo?: number; icone: keyof typeof ICONES }) {
  return (
    <Secao icone={icone} titulo={titulo}>
      <Barras itens={linhas.map((l) => ({ rotulo: l.chave, valor: l.cavas }))} />
      {linhas.length > 0 && (
        <div className="ind-tabela">
          <table>
            <thead>
              <tr>
                <th>{colunaChave}</th>
                <th>Registros</th>
                <th>Cavas</th>
                <th>Fotos</th>
                <th>Obras</th>
                <th>{diasPeriodo ? "Dias trab." : "Dias"}</th>
                {diasPeriodo ? <th title={`Dias do período (${diasPeriodo}) sem nenhum registro`}>Sem trabalho</th> : null}
                <th title="Cavas ÷ dias com registro">Média/dia</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave}>
                  <td>{l.chave}</td>
                  <td>{l.registros}</td>
                  <td>{l.cavas}</td>
                  <td>{l.fotos}</td>
                  <td>{l.obras}</td>
                  <td>{l.dias}</td>
                  {diasPeriodo ? (
                    <td style={{ color: diasPeriodo - l.dias > 0 ? "#d93025" : undefined }}>{Math.max(0, diasPeriodo - l.dias)}</td>
                  ) : null}
                  <td><span className="ind-pill">{fmtMedia(l.mediaDia)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Secao>
  );
}

const OPERADORES_CAMPO = OPERADORES.filter(
  (o) => !o.admin && !OPERADORES_EXCLUIDOS_INDICADORES.includes(o.nome)
).sort((a, b) => a.nome.localeCompare(b.nome));

function diasNoIntervalo(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  let atual = new Date(`${inicio}T00:00:00Z`);
  const limite = new Date(`${fim}T00:00:00Z`);
  while (atual <= limite) {
    dias.push(atual.toISOString().slice(0, 10));
    atual = new Date(atual.getTime() + 86400000);
  }
  return dias;
}

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

interface Justificativa {
  cpf: string;
  operador: string;
  data: string;
  motivo: string;
}

function chaveJust(cpf: string, data: string) {
  return `${cpf}|${data}`;
}

const SEM_JUSTIFICATIVA = "Sem justificativa";

const CORES_MOTIVO: Record<string, string> = {
  [SEM_JUSTIFICATIVA]: "#d93025",
  Folga: "#1f8a4c",
  Falta: "#b71c1c",
  "Atestado médico": "#9334e6",
  "Exame periódico": "#7cb342",
  Férias: "#12939a",
  "Chuva / Clima": "#0288d1",
  "Manutenção de equipamento": "#795548",
  "Deslocamento entre obras": "#e8710a",
  "Sem obra disponível": "#5d6f6c",
  Outro: "#e52592",
};

interface MotivosPorOperador {
  operador: string;
  total: number;
  porMotivo: Record<string, number>;
}

function agregarMotivosPorOperador(
  dias: string[],
  porDia: Map<string, Set<string>>,
  justificativas: Record<string, string>
): MotivosPorOperador[] {
  return OPERADORES_CAMPO.map((op) => {
    const porMotivo: Record<string, number> = {};
    let total = 0;
    for (const dia of dias) {
      if (porDia.get(dia)?.has(op.nome)) continue;
      const motivo = justificativas[chaveJust(op.cpf, dia)] || SEM_JUSTIFICATIVA;
      porMotivo[motivo] = (porMotivo[motivo] || 0) + 1;
      total += 1;
    }
    return { operador: op.nome, total, porMotivo };
  }).sort((a, b) => b.total - a.total);
}

function GraficoMotivosPorOperador({ linhas }: { linhas: MotivosPorOperador[] }) {
  return (
    <BarrasEmpilhadas
      linhas={linhas.map((l) => ({ rotulo: l.operador, total: l.total, partes: l.porMotivo }))}
      categorias={[SEM_JUSTIFICATIVA, ...MOTIVOS_JUSTIFICATIVA]}
      cores={CORES_MOTIVO}
      vazio="Nenhum dia sem lançamento no período."
    />
  );
}

interface DiasLancadosPorOperador {
  operador: string;
  diasLancados: number;
  totalDias: number;
}

function GraficoDiasLancados({ linhas }: { linhas: DiasLancadosPorOperador[] }) {
  if (linhas.every((l) => l.diasLancados === 0)) return <p className="ind-vazio">Nenhum lançamento no período.</p>;
  return (
    <Barras
      itens={linhas.map((l) => ({
        rotulo: l.operador,
        valor: l.diasLancados,
        texto: `${l.diasLancados} / ${l.totalDias}`,
        title: `${l.operador}: ${l.diasLancados} de ${l.totalDias} dia(s)`,
      }))}
    />
  );
}

function TabelaFrequencia({
  lista,
  dataInicio,
  dataFim,
  cpfAdmin,
}: {
  lista: RegistroLinha[];
  dataInicio: string;
  dataFim: string;
  cpfAdmin: string;
}) {
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [carregandoJust, setCarregandoJust] = useState(false);

  useEffect(() => {
    if (!dataInicio || !dataFim) return;
    let cancelado = false;

    async function carregar() {
      setCarregandoJust(true);
      const params = new URLSearchParams({ cpf: cpfAdmin, dataInicio, dataFim });
      const resp = await fetch(`/api/justificativas?${params.toString()}`);
      const lista: Justificativa[] = resp.ok ? await resp.json() : [];
      if (cancelado) return;
      const mapa: Record<string, string> = {};
      for (const j of lista) mapa[chaveJust(j.cpf, j.data)] = j.motivo;
      setJustificativas(mapa);
      setCarregandoJust(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim, cpfAdmin]);

  async function salvarJustificativa(operadorCpf: string, data: string, motivo: string) {
    setJustificativas((atual) => ({ ...atual, [chaveJust(operadorCpf, data)]: motivo }));
    await fetch("/api/justificativas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfAdmin, operadorCpf, data, motivo }),
    });
  }

  if (!dataInicio || !dataFim) {
    return <p style={{ color: "#888" }}>Escolha as datas &quot;De&quot; e &quot;Até&quot; acima e toque em Buscar pra ver esse relatório.</p>;
  }

  const dias = diasNoIntervalo(dataInicio, dataFim);

  const porDia = new Map<string, Set<string>>();
  for (const dia of dias) porDia.set(dia, new Set());
  for (const r of lista) {
    if (porDia.has(r.data)) porDia.get(r.data)!.add(r.operador);
  }

  const resumoPorOperador = OPERADORES_CAMPO.map((op) => {
    const diasSemLancar = dias.filter((dia) => !porDia.get(dia)?.has(op.nome));
    const semJustificativa = diasSemLancar.filter((dia) => !justificativas[chaveJust(op.cpf, dia)]);
    return {
      operador: op.nome,
      diasSemLancar: diasSemLancar.length,
      semJustificativa: semJustificativa.length,
      totalDias: dias.length,
    };
  }).sort((a, b) => b.semJustificativa - a.semJustificativa);

  const totalDiasSemLancar = resumoPorOperador.reduce((soma, o) => soma + o.diasSemLancar, 0);
  const totalSemJustificativa = resumoPorOperador.reduce((soma, o) => soma + o.semJustificativa, 0);
  const totalJustificado = totalDiasSemLancar - totalSemJustificativa;

  const diasLancadosPorOperador: DiasLancadosPorOperador[] = resumoPorOperador
    .map((o) => ({ operador: o.operador, diasLancados: o.totalDias - o.diasSemLancar, totalDias: o.totalDias }))
    .sort((a, b) => b.diasLancados - a.diasLancados);
  const totalDiasLancados = diasLancadosPorOperador.reduce((soma, o) => soma + o.diasLancados, 0);

  return (
    <div>
      <div className="ind-kpis">
        <Kpi icone="calendario" valor={totalDiasSemLancar} rotulo="Dias sem lançamento (soma)" cor="#1f5fbf" fundo="#f2f6fd" />
        <Kpi icone="alerta" valor={totalSemJustificativa} rotulo="Sem justificativa" cor="#dc1f3a" fundo="#fdf2f3" alerta={totalSemJustificativa > 0} />
        <Kpi icone="ok" valor={totalJustificado} rotulo="Justificados" cor="#2f9e4b" fundo="#eef8f0" />
      </div>

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="calendario" />
          Dias Lançados por Operador <span style={{ color: "#666", fontWeight: 400, fontSize: 14 }}>({totalDiasLancados} no total)</span>
        </h3>
        <p className="ind-desc">
          Quantos dos {dias.length} dia(s) do período cada operador lançou pelo menos um registro.
        </p>
        <GraficoDiasLancados linhas={diasLancadosPorOperador} />
      </div>

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="alerta" />Motivos por Operador</h3>
        <p className="ind-desc">
          Dias sem lançamento de cada operador, separados por motivo (inclui os ainda sem justificativa).
        </p>
        <GraficoMotivosPorOperador linhas={agregarMotivosPorOperador(dias, porDia, justificativas)} />
      </div>

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="lista" />Resumo — dias sem lançamento</h3>
        <p className="ind-desc">
          De {dias.length} dia(s) no período, quantos cada operador ficou sem lançar nenhum registro — e quantos
          desses ainda não têm justificativa.
        </p>
        <div className="ind-tabela">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Operador</th>
                <th>Dias sem lançar</th>
                <th>Sem justificativa</th>
                <th>Dias com lançamento</th>
              </tr>
            </thead>
            <tbody>
              {resumoPorOperador.map((o) => (
                <tr key={o.operador}>
                  <td>{o.operador}</td>
                  <td>{o.diasSemLancar}</td>
                  <td style={{ padding: 8, fontWeight: 700, color: o.semJustificativa > 0 ? "#d93025" : "#2f9e4b" }}>
                    {o.semJustificativa}
                  </td>
                  <td>{o.totalDias - o.diasSemLancar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="calendario" />Dia a dia</h3>
        <p className="ind-desc">
          ✓ lançou pelo menos um registro naquele dia. Nos dias sem lançamento, escolha um motivo padrão pra
          justificar. {carregandoJust && "Carregando justificativas..."}
        </p>
        <div className="ind-tabela">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Data</th>
                {OPERADORES_CAMPO.map((op) => (
                  <th key={op.cpf} style={{ padding: 8, fontSize: 11, whiteSpace: "nowrap" }}>
                    {op.nome.split(" ").slice(0, 2).join(" ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dias.map((dia) => (
                <tr key={dia}>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>{formatarDataCurta(dia)}</td>
                  {OPERADORES_CAMPO.map((op) => {
                    const lancou = porDia.get(dia)?.has(op.nome);
                    if (lancou) {
                      return (
                        <td key={op.cpf} style={{ padding: 8, textAlign: "center", color: "#2f9e4b", fontWeight: 700 }}>
                          ✓
                        </td>
                      );
                    }
                    const motivoAtual = justificativas[chaveJust(op.cpf, dia)] ?? "";
                    return (
                      <td key={op.cpf} style={{ padding: 4, textAlign: "center" }}>
                        <select
                          value={motivoAtual}
                          onChange={(e) => salvarJustificativa(op.cpf, dia, e.target.value)}
                          style={{
                            fontSize: 11,
                            padding: "4px 2px",
                            borderRadius: 4,
                            border: "1px solid #ddd",
                            color: motivoAtual ? "#0f3b3c" : "#d93025",
                            fontWeight: 700,
                            maxWidth: 110,
                          }}
                        >
                          <option value="">— (sem motivo)</option>
                          {MOTIVOS_JUSTIFICATIVA.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type TipoEquipamento = "novo" | "antigo";

const LABEL_TIPO: Record<TipoEquipamento, string> = {
  novo: "Trado Novo (bits diamantado)",
  antigo: "Trado Antigo",
};

interface EquipeTradoLinha {
  id: number;
  cidade: string;
  responsavel: string | null;
  tipoEquipamento: TipoEquipamento;
  ativo: boolean;
}

interface CavaTradoLinha {
  id: number;
  data: string;
  equipeId: number;
  quantidadeCavas: number;
  // Nomes de campo antigos — obrasAtribuidas na prática guarda "obras c/
  // trado usado" (tentativas) e obrasTentativas guarda "obras concluídas".
  obrasAtribuidas: number;
  obrasTentativas: number;
  observacao: string | null;
}

function LinhaEquipeEditavel({
  equipe,
  cpfAdmin,
  onSalvo,
}: {
  equipe: EquipeTradoLinha;
  cpfAdmin: string;
  onSalvo: () => void;
}) {
  const [cidade, setCidade] = useState(equipe.cidade);
  const [responsavel, setResponsavel] = useState(equipe.responsavel ?? "");
  const [tipoEquipamento, setTipoEquipamento] = useState<TipoEquipamento>(equipe.tipoEquipamento);
  const [ativo, setAtivo] = useState(equipe.ativo);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    await fetch(`/api/equipes-trado/${equipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfAdmin, cidade, responsavel: responsavel || null, tipoEquipamento, ativo }),
    });
    setSalvando(false);
    onSalvo();
  }

  return (
    <tr style={{ opacity: ativo ? 1 : 0.5 }}>
      <td style={{ padding: 6 }}>
        <input className="campo-grande" style={{ padding: 6, width: 140 }} value={cidade} onChange={(e) => setCidade(e.target.value)} />
      </td>
      <td style={{ padding: 6 }}>
        <input
          className="campo-grande"
          style={{ padding: 6, width: 160 }}
          value={responsavel}
          placeholder="(sem nome ainda)"
          onChange={(e) => setResponsavel(e.target.value)}
        />
      </td>
      <td style={{ padding: 6 }}>
        <select
          className="campo-grande"
          style={{ padding: 6 }}
          value={tipoEquipamento}
          onChange={(e) => setTipoEquipamento(e.target.value as TipoEquipamento)}
        >
          <option value="novo">Trado Novo</option>
          <option value="antigo">Trado Antigo</option>
        </select>
      </td>
      <td style={{ padding: 6, textAlign: "center" }}>
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
      </td>
      <td style={{ padding: 6 }}>
        <button className="btn-avancar" style={{ padding: "6px 12px", fontSize: 12 }} onClick={salvar} disabled={salvando}>
          {salvando ? "..." : "Salvar"}
        </button>
      </td>
    </tr>
  );
}

function AbaCavasTrado({ dataInicio, dataFim, cpfAdmin }: { dataInicio: string; dataFim: string; cpfAdmin: string }) {
  const [lista, setLista] = useState<CavaTradoLinha[]>([]);
  const [equipes, setEquipes] = useState<EquipeTradoLinha[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarGerenciar, setMostrarGerenciar] = useState(false);

  const [formData, setFormData] = useState("");
  const [formEquipeId, setFormEquipeId] = useState("");
  const [formQuantidade, setFormQuantidade] = useState("");
  const [formObrasAtribuidas, setFormObrasAtribuidas] = useState("");
  const [formObrasTentativas, setFormObrasTentativas] = useState("");
  const [formObservacao, setFormObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [novaCidade, setNovaCidade] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoEquipamento>("antigo");
  const [criandoEquipe, setCriandoEquipe] = useState(false);

  const equipesAtivas = equipes.filter((e) => e.ativo);
  const equipesNovo = equipesAtivas.filter((e) => e.tipoEquipamento === "novo");
  const equipesAntigo = equipesAtivas.filter((e) => e.tipoEquipamento === "antigo");
  const equipeIdSelecionado = formEquipeId || String(equipesAtivas[0]?.id ?? "");

  async function carregar() {
    setCarregando(true);
    const params = new URLSearchParams({ cpf: cpfAdmin });
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    const [respCavas, respEquipes] = await Promise.all([
      fetch(`/api/cavas-trado?${params.toString()}`),
      fetch(`/api/equipes-trado?cpf=${encodeURIComponent(cpfAdmin)}`),
    ]);
    const jsonCavas = respCavas.ok ? await respCavas.json() : [];
    const jsonEquipes = respEquipes.ok ? await respEquipes.json() : [];
    setLista(Array.isArray(jsonCavas) ? jsonCavas : []);
    setEquipes(Array.isArray(jsonEquipes) ? jsonEquipes : []);
    setCarregando(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca ao montar/trocar filtro, mesmo padrão usado em TabelaFrequencia
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, cpfAdmin]);

  async function salvar() {
    setErro(null);
    const quantidade = Number(formQuantidade);
    // obrasAtribuidas = "obras c/ trado usado" (tentativas); obrasTentativas
    // = "obras concluídas" — nomes de variável antigos, ver comentário no schema.
    const obrasAtribuidas = Number(formObrasAtribuidas || 0);
    const obrasTentativas = Number(formObrasTentativas || 0);
    if (!formData || !equipeIdSelecionado) {
      setErro("Escolha a data e a equipe.");
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      setErro("Quantidade de cavas inválida.");
      return;
    }
    if (!Number.isInteger(obrasAtribuidas) || obrasAtribuidas < 0 || !Number.isInteger(obrasTentativas) || obrasTentativas < 0) {
      setErro("Obras c/ trado usado/concluídas inválidas.");
      return;
    }
    if (obrasAtribuidas > 0 && obrasTentativas > obrasAtribuidas) {
      setErro("Obras concluídas não pode ser maior que obras c/ trado usado.");
      return;
    }

    setSalvando(true);
    const resp = await fetch("/api/cavas-trado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cpf: cpfAdmin,
        data: formData,
        equipeId: Number(equipeIdSelecionado),
        quantidadeCavas: quantidade,
        obrasAtribuidas,
        obrasTentativas,
        observacao: formObservacao || null,
      }),
    });
    setSalvando(false);

    if (!resp.ok) {
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }

    setFormQuantidade("");
    setFormObrasAtribuidas("");
    setFormObrasTentativas("");
    setFormObservacao("");
    await carregar();
  }

  async function apagar(id: number) {
    if (!confirm("Apagar esse lançamento?")) return;
    await fetch(`/api/cavas-trado/${id}?cpf=${encodeURIComponent(cpfAdmin)}`, { method: "DELETE" });
    await carregar();
  }

  async function criarEquipe() {
    if (!novaCidade.trim()) return;
    setCriandoEquipe(true);
    await fetch("/api/equipes-trado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfAdmin, cidade: novaCidade.trim(), responsavel: novoResponsavel || null, tipoEquipamento: novoTipo }),
    });
    setCriandoEquipe(false);
    setNovaCidade("");
    setNovoResponsavel("");
    await carregar();
  }

  function resumoDoGrupo(grupo: EquipeTradoLinha[]) {
    return grupo.map((eq) => {
      const doTime = lista.filter((l) => l.equipeId === eq.id);
      const totalCavas = doTime.reduce((soma, l) => soma + l.quantidadeCavas, 0);
      // obrasAtribuidas = tentou c/ trado; obrasTentativas = concluiu (ver
      // comentário no schema sobre os nomes de campo antigos).
      const totalObrasTentou = doTime.reduce((soma, l) => soma + l.obrasAtribuidas, 0);
      const totalObrasConcluidas = doTime.reduce((soma, l) => soma + l.obrasTentativas, 0);
      const dias = doTime.length;
      return {
        ...eq,
        totalCavas,
        totalObrasTentou,
        totalObrasConcluidas,
        totalObrasNaoConseguiu: Math.max(totalObrasTentou - totalObrasConcluidas, 0),
        dias,
        mediaPorDia: dias > 0 ? totalCavas / dias : 0,
        pctSucesso: totalObrasTentou > 0 ? (totalObrasConcluidas / totalObrasTentou) * 100 : null,
        pctNaoConseguiu:
          totalObrasTentou > 0 ? (Math.max(totalObrasTentou - totalObrasConcluidas, 0) / totalObrasTentou) * 100 : null,
      };
    });
  }

  const resumoNovo = resumoDoGrupo(equipesNovo);
  const resumoAntigo = resumoDoGrupo(equipesAntigo);
  const totalNovo = resumoNovo.reduce((s, e) => s + e.totalCavas, 0);
  const totalAntigo = resumoAntigo.reduce((s, e) => s + e.totalCavas, 0);
  const diasNovo = new Set(
    lista.filter((l) => equipesNovo.some((e) => e.id === l.equipeId)).map((l) => l.data)
  ).size;
  const diasAntigo = new Set(
    lista.filter((l) => equipesAntigo.some((e) => e.id === l.equipeId)).map((l) => l.data)
  ).size;
  const mediaNovo = diasNovo > 0 ? totalNovo / diasNovo : 0;
  const mediaAntigo = diasAntigo > 0 ? totalAntigo / diasAntigo : 0;

  const linhasOrdenadas = [...lista].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  const dias = dataInicio && dataFim ? diasNoIntervalo(dataInicio, dataFim) : [];

  return (
    <div>
      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="trado" />Lançar produção do dia</h3>
        {erro && <p style={{ color: "#d93025", marginBottom: 8 }}>{erro}</p>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ fontSize: 13, color: "#666" }}>
            Data
            <br />
            <input
              className="campo-grande"
              style={{ width: 160, padding: 10, marginTop: 4 }}
              type="date"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 13, color: "#666" }}>
            Equipe
            <br />
            <select
              className="campo-grande"
              style={{ width: 240, padding: 10, marginTop: 4 }}
              value={equipeIdSelecionado}
              onChange={(e) => setFormEquipeId(e.target.value)}
            >
              {equipesAtivas.length === 0 && <option value="">Cadastre uma equipe abaixo primeiro</option>}
              <optgroup label={LABEL_TIPO.novo}>
                {equipesNovo.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.cidade}
                    {eq.responsavel ? ` — ${eq.responsavel}` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label={LABEL_TIPO.antigo}>
                {equipesAntigo.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.cidade}
                    {eq.responsavel ? ` — ${eq.responsavel}` : ""}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label style={{ fontSize: 13, color: "#666" }}>
            Obras c/ trado usado
            <br />
            <input
              className="campo-grande"
              style={{ width: 120, padding: 10, marginTop: 4 }}
              type="number"
              min={0}
              value={formObrasAtribuidas}
              onChange={(e) => setFormObrasAtribuidas(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 13, color: "#666" }}>
            Obras concluídas
            <br />
            <input
              className="campo-grande"
              style={{ width: 120, padding: 10, marginTop: 4 }}
              type="number"
              min={0}
              value={formObrasTentativas}
              onChange={(e) => setFormObrasTentativas(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 13, color: "#666" }}>
            Qtd. de cavas
            <br />
            <input
              className="campo-grande"
              style={{ width: 120, padding: 10, marginTop: 4 }}
              type="number"
              min={0}
              value={formQuantidade}
              onChange={(e) => setFormQuantidade(e.target.value)}
            />
          </label>
          <label style={{ fontSize: 13, color: "#666", flex: "1 1 200px" }}>
            Observação (opcional)
            <br />
            <input
              className="campo-grande"
              style={{ width: "100%", padding: 10, marginTop: 4 }}
              type="text"
              value={formObservacao}
              onChange={(e) => setFormObservacao(e.target.value)}
            />
          </label>
          <button className="btn-avancar" style={{ padding: "10px 20px" }} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          Já existe um lançamento pra essa equipe nesse dia? Salvar de novo substitui o número.
          &quot;Obras c/ trado usado&quot; e &quot;concluídas&quot; são opcionais (ficam 0 se deixar em branco) —
          preencha as duas pra ver o % de sucesso por equipe.
        </p>
      </div>

      <div className="ind-secao">
        <button
          onClick={() => setMostrarGerenciar((v) => !v)}
          style={{ border: "none", background: "none", color: "#0f3b3c", cursor: "pointer", fontWeight: 700, fontSize: 14, padding: 0, marginBottom: 12 }}
        >
          {mostrarGerenciar ? "▾" : "▸"} Gerenciar equipes ({equipes.length})
        </button>
        {mostrarGerenciar && (
          <div>
            <div className="ind-tabela" style={{ marginBottom: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: 6 }}>Cidade</th>
                    <th style={{ padding: 6 }}>Responsável</th>
                    <th style={{ padding: 6 }}>Equipamento</th>
                    <th style={{ padding: 6 }}>Ativa</th>
                    <th style={{ padding: 6 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {equipes.map((eq) => (
                    <LinhaEquipeEditavel key={eq.id} equipe={eq} cpfAdmin={cpfAdmin} onSalvo={carregar} />
                  ))}
                  {equipes.length === 0 && (
                    <tr>
                      <td style={{ padding: 6 }} colSpan={5}>
                        Nenhuma equipe cadastrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", background: "#f2f5f4", borderRadius: 10, padding: 12 }}>
              <label style={{ fontSize: 13, color: "#666" }}>
                Cidade
                <br />
                <input
                  className="campo-grande"
                  style={{ padding: 8, width: 160, marginTop: 4 }}
                  value={novaCidade}
                  onChange={(e) => setNovaCidade(e.target.value)}
                  placeholder="Ex: Salgueiro"
                />
              </label>
              <label style={{ fontSize: 13, color: "#666" }}>
                Responsável (opcional)
                <br />
                <input
                  className="campo-grande"
                  style={{ padding: 8, width: 180, marginTop: 4 }}
                  value={novoResponsavel}
                  onChange={(e) => setNovoResponsavel(e.target.value)}
                  placeholder="Ainda não sei"
                />
              </label>
              <label style={{ fontSize: 13, color: "#666" }}>
                Equipamento
                <br />
                <select
                  className="campo-grande"
                  style={{ padding: 8, marginTop: 4 }}
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as TipoEquipamento)}
                >
                  <option value="novo">Trado Novo</option>
                  <option value="antigo">Trado Antigo</option>
                </select>
              </label>
              <button className="btn-avancar" style={{ padding: "8px 16px" }} onClick={criarEquipe} disabled={criandoEquipe}>
                {criandoEquipe ? "Adicionando..." : "+ Adicionar equipe"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="trado" />Trado Novo × Trado Antigo</h3>
        <div className="ind-kpis">
          <Kpi icone="trado" valor={totalNovo} rotulo={`Trado Novo · média ${fmtMedia(mediaNovo)}/dia (${diasNovo} dia(s))`} cor="#1d7a4c" fundo="#eef8f0" />
          <Kpi icone="trado" valor={totalAntigo} rotulo={`Trado Antigo · média ${fmtMedia(mediaAntigo)}/dia (${diasAntigo} dia(s))`} cor="#f08a1c" fundo="#fff6ec" />
        </div>
      </div>

      {dias.length > 0 && (
        <div className="ind-secao">
          <h3 className="ind-h3"><Ico nome="calendario" />Dia a dia — Novo × Antigo</h3>
          <div className="ind-tabela">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th style={{ padding: 8, color: "#1f8a4c" }}>Trado Novo</th>
                  <th style={{ padding: 8, color: "#e8710a" }}>Trado Antigo</th>
                </tr>
              </thead>
              <tbody>
                {dias.map((dia) => {
                  const doDiaNovo = lista.filter((l) => l.data === dia && equipesNovo.some((e) => e.id === l.equipeId));
                  const doDiaAntigo = lista.filter((l) => l.data === dia && equipesAntigo.some((e) => e.id === l.equipeId));
                  const somaNovo = doDiaNovo.reduce((s, l) => s + l.quantidadeCavas, 0);
                  const somaAntigo = doDiaAntigo.reduce((s, l) => s + l.quantidadeCavas, 0);
                  return (
                    <tr key={dia}>
                      <td>{formatarDataCurta(dia)}</td>
                      <td style={{ padding: 8, fontWeight: doDiaNovo.length ? 700 : 400, color: doDiaNovo.length ? "#1f8a4c" : "#bbb" }}>
                        {doDiaNovo.length ? somaNovo : "—"}
                      </td>
                      <td style={{ padding: 8, fontWeight: doDiaAntigo.length ? 700 : 400, color: doDiaAntigo.length ? "#e8710a" : "#bbb" }}>
                        {doDiaAntigo.length ? somaAntigo : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="pessoas" />Resumo por equipe</h3>
        <div className="ind-tabela">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Equipe</th>
                <th>Responsável</th>
                <th>Equipamento</th>
                <th>Cavas</th>
                <th>Dias lançados</th>
                <th>Média de cavas/dia</th>
              </tr>
            </thead>
            <tbody>
              {[...resumoNovo, ...resumoAntigo].map((eq) => (
                <tr key={eq.id}>
                  <td>{eq.cidade}</td>
                  <td>{eq.responsavel ?? "—"}</td>
                  <td>{LABEL_TIPO[eq.tipoEquipamento]}</td>
                  <td>{eq.totalCavas}</td>
                  <td>{eq.dias}</td>
                  <td style={{ padding: 8, fontWeight: 700 }}>{eq.mediaPorDia.toFixed(1)}</td>
                </tr>
              ))}
              {equipesAtivas.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    Nenhuma equipe ativa cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="grafico" />Aproveitamento por equipe</h3>
        <p className="ind-desc">
          De todas as obras onde a equipe usou o trado, quantas ela conseguiu fazer de verdade. % de sucesso = obras
          concluídas ÷ obras c/ trado usado.
        </p>
        <div className="ind-tabela">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Responsável</th>
                <th>Equipamento</th>
                <th>Obras c/ trado usado</th>
                <th>Obras concluídas</th>
                <th>Não conseguiu fazer</th>
                <th>% não conseguiu</th>
                <th>Cavas feitas</th>
                <th>% de sucesso</th>
              </tr>
            </thead>
            <tbody>
              {[...resumoNovo, ...resumoAntigo]
                .slice()
                .sort((a, b) => (b.pctSucesso ?? -1) - (a.pctSucesso ?? -1))
                .map((eq) => (
                  <tr key={eq.id}>
                    <td>{eq.responsavel ?? eq.cidade}</td>
                    <td>{LABEL_TIPO[eq.tipoEquipamento]}</td>
                    <td>{eq.totalObrasTentou}</td>
                    <td>{eq.totalObrasConcluidas}</td>
                    <td style={{ padding: 8, color: eq.totalObrasNaoConseguiu > 0 ? "#d93025" : undefined }}>
                      {eq.totalObrasNaoConseguiu}
                    </td>
                    <td style={{ padding: 8, color: eq.pctNaoConseguiu === null ? "#bbb" : "#d93025" }}>
                      {eq.pctNaoConseguiu === null ? "—" : `${eq.pctNaoConseguiu.toFixed(0)}%`}
                    </td>
                    <td>{eq.totalCavas}</td>
                    <td style={{ padding: 8, fontWeight: 700, color: eq.pctSucesso === null ? "#bbb" : "#0f3b3c" }}>
                      {eq.pctSucesso === null ? "—" : `${eq.pctSucesso.toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
              {equipesAtivas.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    Nenhuma equipe ativa cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ind-secao">
        <h3 className="ind-h3"><Ico nome="lista" />Lançamentos no período</h3>
        {carregando && <p>Carregando...</p>}
        {!carregando && (
          <div className="ind-tabela">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Equipe</th>
                  <th>Obras c/trado</th>
                  <th>Concluídas</th>
                  <th>Cavas</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {linhasOrdenadas.map((l) => {
                  const eq = equipes.find((e) => e.id === l.equipeId);
                  return (
                    <tr key={l.id}>
                      <td>{formatarDataCurta(l.data)}</td>
                      <td>{eq ? eq.cidade : `Equipe #${l.equipeId}`}</td>
                      <td>{l.obrasAtribuidas || "—"}</td>
                      <td>{l.obrasTentativas || "—"}</td>
                      <td>{l.quantidadeCavas}</td>
                      <td>{l.observacao ?? "—"}</td>
                      <td>
                        <button
                          onClick={() => apagar(l.id)}
                          style={{ border: "none", background: "none", color: "#d93025", cursor: "pointer", fontSize: 12 }}
                        >
                          Apagar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {linhasOrdenadas.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      Nenhum lançamento no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PainelIndicadores({ cpfAdmin, onVoltar }: { cpfAdmin: string; onVoltar?: () => void }) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [lista, setLista] = useState<RegistroLinha[] | null>(null);
  const [aba, setAba] = useState<"indicadores" | "frequencia" | "trado">("indicadores");
  const [funcionario, setFuncionario] = useState(""); // "" = todos

  async function buscar() {
    setCarregando(true);
    const params = new URLSearchParams({ cpf: cpfAdmin });
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    const resp = await fetch(`/api/registros?${params.toString()}`);
    const json = resp.ok ? await resp.json() : [];
    setLista(Array.isArray(json) ? json : []);
    setCarregando(false);
  }

  // Filtro por funcionário vale para todos os indicadores e para a frequência.
  const listaVis = (lista ?? []).filter((r) => !funcionario || r.operador === funcionario);
  const operadoresNaLista = Array.from(new Set((lista ?? []).map((r) => r.operador))).sort();
  const totalRegistros = listaVis.length;
  const totalCavas = listaVis.reduce((soma, r) => soma + r.totalCavas, 0);
  const totalFotos = listaVis.reduce((soma, r) => soma + r.fotos.length, 0);
  const totalObras = new Set(listaVis.map((r) => r.obra)).size;
  const diasComRegistro = new Set(listaVis.map((r) => r.data)).size;
  const mediaPorDia = diasComRegistro ? totalCavas / diasComRegistro : 0;
  const datasLista = (lista ?? []).map((r) => r.data).sort();
  const periodoInicio = dataInicio || datasLista[0] || "";
  const periodoFim = dataFim || datasLista[datasLista.length - 1] || "";
  const diasPeriodo = periodoInicio && periodoFim && periodoInicio <= periodoFim ? diasNoIntervalo(periodoInicio, periodoFim).length : 0;
  const diasSemTrabalho = Math.max(0, diasPeriodo - diasComRegistro);

  const abas = [
    ["indicadores", "Indicadores"],
    ["frequencia", "Frequência"],
    ["trado", "Trado"],
  ] as const;
  const operadoresIndicadores = listaVis.filter((r) => !OPERADORES_EXCLUIDOS_INDICADORES.includes(r.operador));

  return (
    <div className="ind-painel">
      <div className="ind-cabecalho">
        <h1>
          <Ico nome="grafico" />
          Painel de Indicadores
        </h1>
        {onVoltar && (
          <button type="button" className="ind-menu" onClick={onVoltar}>
            <Ico nome="menu" />
            Menu
          </button>
        )}
      </div>

      <div className="ind-filtros">
        <label>
          De
          <span className="ind-campo">
            <Ico nome="calendario" />
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </span>
        </label>
        <label>
          Até
          <span className="ind-campo">
            <Ico nome="calendario" />
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </span>
        </label>
        <label className="ind-func">
          Funcionário
          <span className="ind-campo">
            <Ico nome="pessoas" />
            <select value={funcionario} onChange={(e) => setFuncionario(e.target.value)}>
              <option value="">Todos</option>
              {(operadoresNaLista.length ? operadoresNaLista : OPERADORES.map((o) => o.nome).sort()).map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          </span>
        </label>
        <button type="button" className="ind-buscar" onClick={buscar}>
          <Ico nome="busca" />
          Buscar
        </button>
      </div>

      <div className="ind-abas">
        {abas.map(([id, nome]) => (
          <button key={id} type="button" className={aba === id ? "on" : ""} onClick={() => setAba(id)}>
            {nome}
          </button>
        ))}
      </div>

      {aba === "trado" && <AbaCavasTrado dataInicio={dataInicio} dataFim={dataFim} cpfAdmin={cpfAdmin} />}

      {aba !== "trado" && carregando && <p className="ind-vazio">Carregando...</p>}

      {lista && !carregando && aba === "frequencia" && (
        <TabelaFrequencia lista={listaVis} dataInicio={dataInicio} dataFim={dataFim} cpfAdmin={cpfAdmin} />
      )}

      {lista && !carregando && aba === "indicadores" && (
        <>
          <div className="ind-kpis">
            <Kpi icone="registros" valor={totalRegistros} rotulo="Registros" cor="#2f9e4b" fundo="#eef8f0" />
            <Kpi icone="cava" valor={totalCavas} rotulo="Cavas" cor="#1aa3c4" fundo="#eff9fc" />
            <Kpi icone="foto" valor={totalFotos} rotulo="Fotos" cor="#8e44e0" fundo="#f7f1fd" />
            <Kpi icone="obra" valor={totalObras} rotulo="Obras" cor="#f08a1c" fundo="#fff6ec" />
            <Kpi icone="media" valor={fmtMedia(mediaPorDia)} rotulo="Média/dia" cor="#17a589" fundo="#eefaf7" title="Cavas ÷ dias com registro" />
            <Kpi
              icone="calendario"
              valor={diasComRegistro}
              extra={diasPeriodo ? <>de {diasPeriodo}</> : null}
              rotulo="Dias trabalhados"
              cor="#1f5fbf"
              fundo="#f2f6fd"
              title="Dias com pelo menos um registro no período"
            />
          </div>

          <div className="ind-faixa" title="Dias do período sem nenhum registro (conta sábado e domingo, como na aba Frequência)">
            <span className="ind-faixa-ico"><Ico nome="relogio" /></span>
            <div>
              <b style={diasSemTrabalho > 0 ? { color: "#d93025" } : undefined}>{diasSemTrabalho}</b>
              <small>Dias sem trabalho</small>
            </div>
          </div>

          {funcionario && (
            <p className="ind-filtro-ativo">
              Mostrando só {funcionario} ·{" "}
              <button type="button" onClick={() => setFuncionario("")}>ver todos</button>
            </p>
          )}

          <TabelaAgregada icone="pessoas" titulo="Por Operador" colunaChave="Operador" diasPeriodo={diasPeriodo} linhas={agregarPor(operadoresIndicadores, "operador")} />

          <Secao icone="cava" titulo="Por Tipo de Cava">
            <Barras itens={agregarPor(listaVis, "tipoCava").map((l) => ({ rotulo: l.chave, valor: l.cavas }))} />
          </Secao>

          <Secao icone="obra" titulo="Por Obra">
            <GraficoBarrasEmpilhadasPorTipo linhas={agregarObraPorTipo(listaVis)} />
            {listaVis.length > 0 && (
              <div className="ind-tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Obra</th>
                      <th>Registros</th>
                      <th>Cavas</th>
                      <th>Fotos</th>
                      <th>Dias</th>
                      <th title="Cavas ÷ dias com registro">Média/dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agregarPor(listaVis, "obra").map((l) => (
                      <tr key={l.chave}>
                        <td>{l.chave}</td>
                        <td>{l.registros}</td>
                        <td>{l.cavas}</td>
                        <td>{l.fotos}</td>
                        <td>{l.dias}</td>
                        <td><span className="ind-pill">{fmtMedia(l.mediaDia)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>

          <TabelaMediaCavas
            titulo="Média de Cavas por Obra"
            colunaChave="Obra"
            descricao="Total de cavas dividido pelos dias com registro em cada obra, no período selecionado."
            linhas={agregarMediaCavaPor(listaVis, "obra")}
          />

          <TabelaMediaCavas
            titulo="Média de Cavas por Operador"
            colunaChave="Operador"
            descricao="Total de cavas dividido pelos dias com registro de cada operador, no período selecionado."
            linhas={agregarMediaCavaPor(operadoresIndicadores, "operador")}
          />
        </>
      )}

      {!lista && !carregando && aba !== "trado" && (
        <p className="ind-vazio">Escolha um período (ou deixe em branco pra ver tudo) e toque em Buscar.</p>
      )}
    </div>
  );
}
