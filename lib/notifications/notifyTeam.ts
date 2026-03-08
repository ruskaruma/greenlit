import { Resend } from "resend";
import twilio from "twilio";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

interface NotifyTeamParams {
  clientName: string;
  action: string;
  scriptTitle: string;
  feedback: string | null;
  channel: "email" | "whatsapp" | "both";
}

export async function notifyTeam({
  clientName,
  action,
  scriptTitle,
  feedback,
  channel,
}: NotifyTeamParams): Promise<void> {
  const teamEmail = process.env.TEAM_EMAIL;
  const founderWhatsApp = process.env.FOUNDER_WHATSAPP || process.env.DEMO_WHATSAPP_NUMBER;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const subject = `[Greenlit] ${clientName} ${action} '${scriptTitle}'`;
  const text = `${clientName} ${action} "${scriptTitle}".\n${feedback ? `Feedback: ${feedback}\n` : ""}View: ${appUrl}/dashboard`;

  // Email notification
  if (teamEmail && resend) {
    try {
      await resend.emails.send({
        from: `Greenlit <${process.env.RESEND_FROM_EMAIL || "greenlit@ruskaruma.me"}>`,
        to: [teamEmail],
        subject,
        text,
      });
    } catch (err) {
      console.error("[notifyTeam] Email failed:", err);
    }
  }

  // WhatsApp notification to founder
  if (founderWhatsApp && twilioClient) {
    const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
    const to = founderWhatsApp.startsWith("whatsapp:") ? founderWhatsApp : `whatsapp:${founderWhatsApp}`;

    try {
      await twilioClient.messages.create({
        from,
        to,
        body: text,
      });
    } catch (err) {
      console.error("[notifyTeam] WhatsApp failed:", err);
    }
  } else if (founderWhatsApp && !twilioClient) {
    console.log(`[notifyTeam-mock] WhatsApp to ${founderWhatsApp}: ${text}`);
  }
}
