const TIMEOUT_MS = 45_000;

// Envia uma foto com um limite de tempo — sem isso, em conexão lenta o navegador
// pode ficar esperando a requisição indefinidamente e a tela parece travada.
// Tenta de novo até 3 vezes antes de desistir.
export async function enviarFotoComTimeout(nomeArquivo: string, blob: Blob): Promise<{ url: string }> {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(`/api/fotos?nome=${encodeURIComponent(nomeArquivo)}`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
        signal: controller.signal,
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}) as { erro?: string });
        throw new Error(json.erro || `Erro HTTP ${resp.status}`);
      }
      const json = (await resp.json()) as { url: string };
      return { url: json.url };
    } catch (err) {
      if (tentativa === 3) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Falha ao enviar após tentativas");
}
