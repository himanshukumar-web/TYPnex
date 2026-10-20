/**
 * Production-ready SMS OTP delivery service for TYPnex.
 * Supports Twilio and MSG91 (DLT compliance in India).
 * Validates international E.164 formats including Indian (+91) numbers.
 */

export interface SendSmsOptions {
  to: string; // E.164 formatted (+919876543210 or +12025550123)
  otp: string;
  expiryMinutes?: number;
}

export interface SmsDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Validates phone numbers into strict E.164 format.
 * Automatically normalizes Indian 10-digit mobile numbers starting with 6, 7, 8, or 9 to +91.
 */
export function normalizeAndValidatePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone) {
    return { valid: false, normalized: "", error: "Phone number is required." };
  }

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, "").trim();

  // If starts with +
  if (cleaned.startsWith("+")) {
    // International E.164 pattern: + followed by 8 to 15 digits
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(cleaned)) {
      return { valid: false, normalized: cleaned, error: "Invalid international phone format. Use E.164 format (e.g. +919876543210)." };
    }
    // Specific check for India (+91)
    if (cleaned.startsWith("+91")) {
      const indianNational = cleaned.slice(3);
      if (!/^[6-9]\d{9}$/.test(indianNational)) {
        return { valid: false, normalized: cleaned, error: "Invalid Indian phone number. Expected 10 digits starting with 6, 7, 8, or 9." };
      }
    }
    return { valid: true, normalized: cleaned };
  }

  // If 10 digits (India standard mobile)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return { valid: true, normalized: `+91${cleaned}` };
  }

  return {
    valid: false,
    normalized: cleaned,
    error: "Invalid phone number format. Please provide full country code (e.g. +91 98765 43210).",
  };
}

export async function sendOtpToSms(options: SendSmsOptions): Promise<SmsDeliveryResult> {
  const { valid, normalized, error: valError } = normalizeAndValidatePhone(options.to);
  if (!valid) {
    return { success: false, error: valError };
  }

  const expiry = options.expiryMinutes || 5;
  const messageText = `Your TYPnex verification code is ${options.otp}. Valid for ${expiry} minutes. Do not share this code with anyone.`;

  // 1. Twilio Provider
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Messages.json`;
      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

      const bodyParams = new URLSearchParams();
      bodyParams.append("To", normalized);
      if (twilioFrom.startsWith("MG")) {
        bodyParams.append("MessagingServiceSid", twilioFrom);
      } else {
        bodyParams.append("From", twilioFrom);
      }
      bodyParams.append("Body", messageText);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.message || `Twilio HTTP ${response.status}`;
        console.error(`[TYPnex SMS Service] Twilio error: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      return { success: true, messageId: data?.sid };
    } catch (err: any) {
      console.error("[TYPnex SMS Service] Twilio network failure:", err?.message);
      return { success: false, error: err?.message };
    }
  }

  // 2. MSG91 Provider (India DLT Compliant)
  const msg91AuthKey = process.env.MSG91_AUTH_KEY;
  const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;

  if (msg91AuthKey && msg91TemplateId) {
    try {
      const response = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          authkey: msg91AuthKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: msg91TemplateId,
          mobile: normalized.replace(/^\+/, ""), // MSG91 expects number without +
          otp: options.otp,
          otp_expiry: expiry,
        }),
      });

      const data = await response.json();

      if (data?.type === "error" || !response.ok) {
        const errorMsg = data?.message || "MSG91 dispatch error";
        console.error(`[TYPnex SMS Service] MSG91 error: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      return { success: true, messageId: data?.request_id };
    } catch (err: any) {
      console.error("[TYPnex SMS Service] MSG91 transmission failure:", err?.message);
      return { success: false, error: err?.message };
    }
  }

  return {
    success: false,
    error: "No SMS provider configured. Set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN or MSG91_AUTH_KEY.",
  };
}
