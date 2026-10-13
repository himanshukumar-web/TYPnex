import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyJwt, TokenPayload } from "./jwt";
import prisma from "@/lib/db";

export const AUTH_COOKIE_NAME = "typnex_auth_token";

export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyJwt(token);
    if (!payload) return null;

    // Check user status in db to ensure not blocked or deleted
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, isBlocked: true, isVerified: true },
    });

    if (!user || user.isBlocked) return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "USER" | "EMPLOYEE" | "ADMIN",
      isVerified: user.isVerified,
    };
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): TokenPayload | null {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value || req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return verifyJwt(token);
  } catch {
    return null;
  }
}
