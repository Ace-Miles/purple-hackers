import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [users, posts, comments, reports, bans] = await Promise.all([
      prisma.user.count(), prisma.post.count(), prisma.comment.count(),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.ban.count({ where: { isLifted: false } }),
    ]);
    const recentReports = await prisma.report.findMany({ take: 5, orderBy: { createdAt: "desc" } });
    const recentUsers = await prisma.user.findMany({ take: 5, orderBy: { joinedAt: "desc" },
      select: { id: true, username: true, email: true, joinedAt: true } });
    return NextResponse.json({ users, posts, comments, reports, bans, online: 0, recentReports, recentUsers });
  } catch { return NextResponse.json({ users: 0, posts: 0, comments: 0, reports: 0, bans: 0, online: 0, recentReports: [], recentUsers: [] }); }
}
