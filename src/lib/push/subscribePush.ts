function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

export type ResultadoInscricao = "inscrito" | "negado" | "sem_suporte" | "erro";

export async function ativarNotificacoes(cpf: string): Promise<ResultadoInscricao> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "sem_suporte";
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return "negado";

  try {
    const registration = await navigator.serviceWorker.ready;
    const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!chavePublica) return "erro";

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(chavePublica),
      });
    }

    const json = subscription.toJSON();
    const resp = await fetch("/api/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf, endpoint: json.endpoint, keys: json.keys }),
    });
    return resp.ok ? "inscrito" : "erro";
  } catch {
    return "erro";
  }
}

export async function notificacoesJaAtivas(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}
