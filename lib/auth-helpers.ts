import prisma from "@/lib/prisma";

export function getUserIdFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("user_id="));

  if (!match) return null;
  const value = match.split("=")[1];
  return value || null;
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
  const cookieHeader = request.headers.get("cookie");
  const userId = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith("user_id="))
    ?.split("=")[1];

  if (!userId) throw new AuthError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") throw new AuthError("Forbidden", 403);

  return userId;
}
