import { TokenPayload } from "./jwt";

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    return atob(base64);
  } catch {
    return "";
  }
}

/**
 * Edge-compatible JWT verification using Web Crypto API.
 * Works seamlessly in Next.js Middleware and Edge runtimes.
 */
export async function verifyJwtEdge(
  token: string,
  secret: string = process.env.JWT_SECRET || "typnex-super-secure-production-jwt-token-secret-2026"
): Promise<TokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const enc = new TextEncoder();

    // Import secret key
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert signature from base64url
    let sigBase64 = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    while (sigBase64.length % 4) sigBase64 += "=";
    const binarySig = atob(sigBase64);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const dataBytes = enc.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    // Check expiration if present
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return payload as TokenPayload;
  } catch {
    return null;
  }
}
