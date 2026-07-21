import type { FotoItem } from "@/types";

// Chave de controle de "essa cava já foi registrada" — precisa incluir o
// tipo, não só o número, porque a numeração da cava reinicia em 1 sempre que
// o tipo muda no meio do turno (ex: cava 1 Rocha, depois cava 1 Normal).
export function chaveCava(tipoCava: string, cava: number): string {
  return `${tipoCava}#${cava}`;
}

export interface DadosCavaParaRegistro {
  data: string;
  obra: string;
  tipoCava: string;
  operador: string;
  cpf: string;
  turnoServerId?: string;
}

export interface ResultadoRegistroCava {
  sucesso: boolean;
  erro?: string;
}

// Cria o registro (1 por cava) no banco. Só funciona se todas as fotos da
// cava já tiverem uploadedUrl — quem chama precisa garantir isso antes
// (ver enviarFotosEmSegundoPlano / enviarFotoComTimeout).
export async function registrarCava(
  dados: DadosCavaParaRegistro,
  fotosCava: FotoItem[]
): Promise<ResultadoRegistroCava> {
  if (fotosCava.length === 0 || !fotosCava.every((f) => f.uploadedUrl)) {
    return { sucesso: false, erro: "Fotos da cava ainda não foram todas enviadas" };
  }

  try {
    const resp = await fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: dados.data,
        obra: dados.obra,
        tipoCava: dados.tipoCava,
        totalCavas: 1,
        operador: dados.operador,
        cpf: dados.cpf,
        observacao: "",
        fotos: fotosCava.map((f) => ({ cava: f.cava, fotoNum: f.fotoNum, label: f.label, url: f.uploadedUrl! })),
        turnoServerId: dados.turnoServerId,
      }),
    });
    const json = await resp.json().catch(() => ({}) as { erro?: string; sucesso?: boolean });
    if (!resp.ok || !json.sucesso) {
      return { sucesso: false, erro: json.erro || "Erro ao registrar cava" };
    }
    return { sucesso: true };
  } catch (err) {
    return { sucesso: false, erro: err instanceof Error ? err.message : String(err) };
  }
}
