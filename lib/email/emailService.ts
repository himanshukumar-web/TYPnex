/**
 * Production-ready transactional email delivery service for TYPnex.
 * Uses native fetch for zero-dependency execution in serverless/Node.js runtime.
 * Supports Resend (preferred) and SendGrid, with graceful error handling.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
  const apiKey =
    process.env.RESEND_API_KEY ||
    process.env.EMAIL_PROVIDER_KEY ||
    "";

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS ||
    "TYPnex <onboarding@resend.dev>"; // Resend verified testing sandbox domain

  if (!apiKey) {
    return {
      success: false,
      error: "EMAIL_PROVIDER_KEY / RESEND_API_KEY is not configured.",
    };
  }

  // 1. Resend Provider (re_... key or standard key)
  if (apiKey.startsWith("re_") || !apiKey.startsWith("SG.")) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ""),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.message || data?.error || `HTTP ${response.status}`;
        console.error(`[TYPnex Email Service] Resend API error: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (err: any) {
      console.error("[TYPnex Email Service] Network failure transmitting email:", err?.message);
      return { success: false, error: err?.message || "Email network failure" };
    }
  }

  // 2. SendGrid Provider (SG.... key)
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: fromAddress.includes("<") ? fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress : fromAddress },
        subject: options.subject,
        content: [
          { type: "text/plain", value: options.text || options.html.replace(/<[^>]*>/g, "") },
          { type: "text/html", value: options.html },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[TYPnex Email Service] SendGrid error: ${errText}`);
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[TYPnex Email Service] SendGrid transmission failed:", err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Generates an accessible, responsive, branded HTML email for OTP verification.
 */
export function buildOtpEmailHtml(otp: string, expiryMinutes: number = 5): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TYPnex Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6fb; margin: 0; padding: 20px; }
    .card { max-width: 480px; margin: 30px auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e9f2; }
    .logo { font-size: 24px; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 24px; letter-spacing: -0.5px; }
    .logo span { color: #6366f1; }
    .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: center; }
    .description { font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; margin-bottom: 24px; }
    .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4338ca; font-family: 'Courier New', Courier, monospace; }
    .expiry { font-size: 13px; color: #e11d48; font-weight: 600; text-align: center; margin-bottom: 24px; }
    .security-notice { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.5; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">TYP<span>nex</span></div>
    <div class="title">Verify Your Account</div>
    <div class="description">Use the verification code below to complete your TYPnex authentication. Never share this code with anyone.</div>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <div class="expiry">Expires in ${expiryMinutes} minutes</div>
    <div class="security-notice">
      If you did not request this verification code, please ignore this email or reach out to support@typnex.com if you suspect unauthorized activity.
    </div>
  </div>
</body>
</html>`;
}
