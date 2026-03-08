import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendReportEmailParams {
  to: string;
  clientName: string;
  contentTitle: string;
  platform: string;
  contentType: string;
  postUrl: string | null;
  postDate: string | null;
  metrics: Record<string, number>;
  previousMetrics: Record<string, number> | null;
  overview: string;
  comparison: string;
  recommendations: string;
}

function formatMetricLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetricValue(key: string, value: number): string {
  if (key.includes("rate") || key === "ctr") return `${value}%`;
  return value.toLocaleString();
}

function changeIndicator(current: number, previous: number): string {
  if (current === previous) return '<span style="color:#a1a1aa;">—</span>';
  const pct = previous !== 0 ? Math.round(((current - previous) / previous) * 100) : 0;
  if (current > previous) {
    return `<span style="color:#22c55e;">&#9650; +${pct}%</span>`;
  }
  return `<span style="color:#ef4444;">&#9660; ${pct}%</span>`;
}

export async function sendReportEmail({
  to,
  clientName,
  contentTitle,
  platform,
  contentType,
  postUrl,
  postDate,
  metrics,
  previousMetrics,
  overview,
  comparison,
  recommendations,
}: SendReportEmailParams): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "greenlit@ruskaruma.me";

  const hasPrev = previousMetrics && Object.keys(previousMetrics).length > 0;

  const metricsRows = Object.entries(metrics)
    .map(([key, value]) => {
      const prev = hasPrev ? previousMetrics[key] : undefined;
      const changeCol = hasPrev && prev !== undefined
        ? `<td style="padding:8px 12px;font-size:12px;text-align:right;border-bottom:1px solid #222222;">${changeIndicator(value, prev)}</td>`
        : "";
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#a1a1aa;border-bottom:1px solid #222222;">${formatMetricLabel(key)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#ffffff;font-weight:600;text-align:right;border-bottom:1px solid #222222;">${formatMetricValue(key, value)}</td>
        ${changeCol}
      </tr>`;
    })
    .join("");

  const changeHeader = hasPrev
    ? '<th style="padding:8px 12px;font-size:10px;color:#F97316;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid #222222;">Change</th>'
    : "";

  const postLink = postUrl
    ? `<p style="margin:0 0 16px 0;font-size:13px;"><a href="${postUrl}" target="_blank" style="color:#F97316;text-decoration:underline;">View post on ${platform}</a></p>`
    : "";

  const dateStr = postDate
    ? `<p style="margin:0 0 16px 0;font-size:12px;color:#71717a;">Posted: ${new Date(postDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>`
    : "";

  const subject = `Performance Report: ${contentTitle} (${platform})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:12px;border:1px solid #222222;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 24px 40px;">
              <p style="margin:0 0 4px 0;font-size:13px;color:#F97316;font-weight:600;letter-spacing:0.5px;">GREENLIT</p>
              <h1 style="margin:0 0 8px 0;font-size:20px;color:#ffffff;font-weight:600;line-height:1.3;">
                Performance Report
              </h1>
              <p style="margin:0 0 4px 0;font-size:14px;color:#a1a1aa;">
                Hi ${clientName}, here's how your ${contentType.toLowerCase()} performed on ${platform}.
              </p>
              ${dateStr}
              ${postLink}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:8px;border:1px solid #222222;">
                <tr>
                  <td style="padding:12px;font-size:11px;color:#F97316;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #222222;">
                    ${contentTitle}
                  </td>
                  <th style="padding:8px 12px;font-size:10px;color:#F97316;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid #222222;">Current</th>
                  ${changeHeader}
                </tr>
                ${metricsRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px 40px;">
              <p style="margin:0 0 8px 0;font-size:11px;color:#F97316;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Performance Overview</p>
              <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.7;">${overview}</p>
            </td>
          </tr>
          ${comparison ? `<tr>
            <td style="padding:0 40px 24px 40px;">
              <p style="margin:0 0 8px 0;font-size:11px;color:#F97316;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Week-on-Week Comparison</p>
              <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.7;">${comparison}</p>
            </td>
          </tr>` : ""}
          ${recommendations ? `<tr>
            <td style="padding:0 40px 32px 40px;">
              <p style="margin:0 0 8px 0;font-size:11px;color:#F97316;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Recommendations</p>
              <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.7;">${recommendations}</p>
            </td>
          </tr>` : ""}
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

  if (!resend) {
    console.log(`[report-email-mock] To: ${to}, Subject: ${subject}`);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: `Greenlit <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error("[report-email] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[report-email] Failed:", message);
    return { success: false, error: message };
  }
}
