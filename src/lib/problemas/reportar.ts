// Avisa a Central de Problemas (melhor esforço: sem internet, não trava nada).
// O mesmo problema só é avisado uma vez a cada 10 minutos por aparelho, para não encher a central.
export function reportarProblema(cpf: string, tipo: string, chave: string, detalhe: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !cpf) return;
  const k = `ecoblaster.problema.${tipo}.${chave}`;
  try {
    const ultimo = Number(localStorage.getItem(k) || 0);
    if (Date.now() - ultimo < 10 * 60_000) return;
    localStorage.setItem(k, String(Date.now()));
  } catch {
    // sem localStorage: avisa assim mesmo
  }
  fetch("/api/problemas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf, tipo, chave, detalhe }),
    keepalive: true,
  }).catch(() => {});
}
