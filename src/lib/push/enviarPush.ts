import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { isAdmin } from "@/lib/config/operadores";

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

// Avisos do escritório (GPS, foto longe da obra...): só para os administradores inscritos.
// Os operadores também podem se inscrever (para o aviso de turno aberto) e não recebem estes.
export async function enviarPushParaTodos(payload: PushPayload): Promise<{ enviados: number; removidos: number }> {
  const inscricoes = (await db.select().from(pushSubscriptions)).filter((i) => isAdmin(i.cpf));
  return enviar(inscricoes, payload);
}

// Notificação para um operador só (todos os aparelhos em que ele ativou as notificações).
export async function enviarPushParaCpf(cpf: string, payload: PushPayload): Promise<{ enviados: number; removidos: number }> {
  return enviar(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.cpf, cpf)), payload);
}

// Inscrição expirada/revogada (404/410) é removida do banco — o resto dos envios não é afetado por isso.
async function enviar(inscricoes: (typeof pushSubscriptions.$inferSelect)[], payload: PushPayload) {
  configurar();

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
