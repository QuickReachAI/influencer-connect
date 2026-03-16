import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || "dev-secret-do-not-use-in-production";
}

export function signCookie(userId: string): string {
  const sig = createHmac("sha256", getSecret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifyCookie(cookieValue: string): string | null {
  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const userId = cookieValue.slice(0, dotIndex);
  const sig = cookieValue.slice(dotIndex + 1);
  const expected = createHmac("sha256", getSecret()).update(userId).digest("hex");
  if (sig.length !== expected.length) return null;
  let match = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig[i] !== expected[i]) match = false;
  }
  return match ? userId : null;
}

export function getUserIdFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("user_id="));

  if (!match) return null;
  const value = match.split("=")[1];
  if (!value) return null;
  return verifyCookie(decodeURIComponent(value));
}

export function getAuthUserId(request: NextRequest): string | null {
  const value = request.cookies.get("user_id")?.value;
  if (!value) return null;
  return verifyCookie(value);
}

export async function requireAuth(request: Request): Promise<string> {
  const userId = getUserIdFromCookies(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return userId;
}

export async function requireAdmin(request: Request): Promise<string> {
  const userId = await requireAuth(request);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Response("Forbidden", { status: 403 });
  }

  return userId;
}

export async function requireRole(
  request: Request,
  role: "CREATOR" | "BRAND" | "ADMIN"
): Promise<string> {
  const userId = await requireAuth(request);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== role) {
    throw new Response("Forbidden", { status: 403 });
  }

  return userId;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
  }
}

export async function verifyAdmin(request: Request): Promise<string> {
  const userId = getUserIdFromCookies(request);

  if (!userId) throw new AuthError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") throw new AuthError("Forbidden", 403);

  return userId;
}
