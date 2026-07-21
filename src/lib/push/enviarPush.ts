import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";

let configurado = false;

function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@ecoeletrica.com.br",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configurado = true;
}

export interface PushPayload {
  titulo: string;
  corpo: string;
  url?: string;
}

// Manda a notificação pra todo mundo inscrito. Inscrição expirada/revogada
// (404/410) é removida do banco — o resto dos envios não é afetado por isso.
export async function enviarPushParaTodos(payload: PushPayload): Promise<{ enviados: number; removidos: number }> {
  configurar();
  const inscricoes = await db.select().from(pushSubscriptions);

  let enviados = 0;
  let removidos = 0;

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          JSON.stringify(payload)
        );
        enviados++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, inscricao.endpoint));
          removidos++;
        } else {
          console.error("Erro ao enviar push:", err);
        }
      }
    })
  );

  return { enviados, removidos };
}
