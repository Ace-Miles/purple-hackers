import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const myRole = (session.user as any).role;
    if (myRole !== "ADMIN" && myRole !== "MODERATOR" && myRole !== "FOUNDER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { userId, reason, points } = await req.json();
    if (!userId || !reason) return NextResponse.json({ error: "User ID and reason required" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if ((target as any).isFounder || target.role === ("FOUNDER" as any)) {
      return NextResponse.json({ error: "Cannot warn the founder" }, { status: 403 });
    }

    if (myRole === "MODERATOR" && target.role === "ADMIN") {
      return NextResponse.json({ error: "Moderators cannot warn admins" }, { status: 403 });
    }

    const warning = await prisma.warning.create({
      data: { userId, reason, issuedBy: (session.user as any).id, points: points || 1 },
    });

    const warningCount = await prisma.warning.count({ where: { userId } });
    if (warningCount >= 5) {
      await prisma.ban.create({
        data: {
          userId,
          reason: "Automatic ban: 5+ warnings",
          issuedBy: (session.user as any).id,
          type: "TEMPORARY",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.user.update({ where: { id: userId }, data: { status: "BANNED" as any } });
    }

    return NextResponse.json({ success: true, warning, totalWarnings: warningCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const myRole = (session.user as any).role;
    if (myRole !== "ADMIN" && myRole !== "MODERATOR" && myRole !== "FOUNDER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const warnings = await prisma.warning.findMany({
      where: userId ? { userId } : {},
      include: { user: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ warnings });
  } catch {
    return NextResponse.json({ warnings: [] });
  }
}
