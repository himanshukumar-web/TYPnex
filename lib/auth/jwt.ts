import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "typnex-super-secure-production-jwt-token-secret-2026";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: "USER" | "EMPLOYEE" | "ADMIN";
  isVerified?: boolean;
}

export function signJwt(payload: TokenPayload, expiresIn: string = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
