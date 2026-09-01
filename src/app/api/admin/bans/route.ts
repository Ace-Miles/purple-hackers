import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const bans = await prisma.ban.findMany({ where: { isLifted: false }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ bans });
}
