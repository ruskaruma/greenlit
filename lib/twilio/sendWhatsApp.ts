import twilio from "twilio";

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

interface SendWhatsAppParams {
  to: string; // e.g. "+919876543210"
  clientName: string;
  scriptTitle: string;
  reviewUrl: string;
}

export async function sendWhatsApp({
  to,
  clientName,
  scriptTitle,
  reviewUrl,
}: SendWhatsAppParams): Promise<{ success: boolean; error?: string }> {
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const body = [
    `Hi ${clientName},`,
    ``,
    `A new script "${scriptTitle}" is ready for your review.`,
    ``,
    `Review it here: ${reviewUrl}`,
    ``,
    `Reply to this message:`,
    `APPROVE - to approve`,
    `REJECT - to reject`,
    `Or type your feedback directly.`,
  ].join("\n");

  if (!client) {
    console.log(`[whatsapp-mock] To: ${toNumber}, Body: ${body}`);
    return { success: true };
  }

  try {
    await client.messages.create({
      from,
      to: toNumber,
      body,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "WhatsApp send failed";
    console.error("[whatsapp] Failed:", message);
    return { success: false, error: message };
  }
}
