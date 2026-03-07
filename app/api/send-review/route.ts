import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClientDirect } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();

  const { script_id, client_email, client_name, script_title, review_token } =
    body as {
      script_id: string;
      client_email: string;
      client_name: string;
      script_title: string;
      review_token: string;
    };

  if (!script_id || !client_email || !client_name || !script_title || !review_token) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewUrl = `${appUrl}/review/${review_token}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "greenlit@ruskaruma.me";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:12px;border:1px solid #222222;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="margin:0 0 4px 0;font-size:13px;color:#00ff88;font-weight:600;letter-spacing:0.5px;">GREENLIT</p>
              <h1 style="margin:0 0 24px 0;font-size:22px;color:#ffffff;font-weight:600;line-height:1.3;">
                Script ready for your review
              </h1>
              <p style="margin:0 0 8px 0;font-size:15px;color:#a1a1aa;line-height:1.6;">
                Hi ${client_name},
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#a1a1aa;line-height:1.6;">
                A new script titled <strong style="color:#ffffff;">"${script_title}"</strong> is ready for your review.
                Please take a moment to read through it and share your feedback.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
                <tr>
                  <td style="background-color:#00ff88;border-radius:8px;">
                    <a href="${reviewUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#0a0a0a;text-decoration:none;">
                      Review Script
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#52525b;line-height:1.5;">
                Or copy this link: ${reviewUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #222222;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">
                Greenlit for Scrollhouse &middot; by ruskaruma
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  try {
    const { error: emailError } = await resend.emails.send({
      from: `Greenlit <${fromEmail}>`,
      to: [client_email],
      subject: `Action needed: Review '${script_title}' for Scrollhouse`,
      html,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }
  } catch (err) {
    console.error("Failed to send email:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }

  // Mark script as sent
  const supabase: SupabaseAny = createServiceClientDirect();
  await supabase
    .from("scripts")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", script_id);

  return NextResponse.json({ success: true });
}
