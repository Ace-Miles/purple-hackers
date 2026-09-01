import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const roleFilter = searchParams.get("role");
  const where: any = {};
  if (search) { where.OR = [{ username: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }]; }
  if (roleFilter) where.role = roleFilter;
  const users = await prisma.user.findMany({ where, take: 50, orderBy: { joinedAt: "desc" },
    select: { id: true, username: true, email: true, role: true, status: true, reputation: true, joinedAt: true, postsCount: true, commentsCount: true, lastSeen: true, isFounder: true } });
  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const myRole = (session.user as any).role;
  if (myRole !== "ADMIN" && myRole !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, action } = await req.json();
  if (!userId || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // The Founder is untouchable — no one can demote, ban, or strip their role
  if ((target as any).isFounder) {
    return NextResponse.json({ error: "The Founder cannot be modified. The King stays King 👑" }, { status: 403 });
  }

  // Only the Founder can promote someone to Admin (regular admins can't create rival admins)
  if (action === "promote_admin" && myRole !== "FOUNDER") {
    return NextResponse.json({ error: "Only the Founder can promote users to Admin" }, { status: 403 });
  }

  if (action === "promote_mod") { await prisma.user.update({ where: { id: userId }, data: { role: "MODERATOR" } }); }
  else if (action === "promote_admin") { await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } }); }
  else if (action === "demote") { await prisma.user.update({ where: { id: userId }, data: { role: "MEMBER" } }); }
  else if (action === "ban") { await prisma.user.update({ where: { id: userId }, data: { status: "BANNED", role: "BANNED" } });
    await prisma.ban.create({ data: { userId, reason: "Banned by admin", issuedBy: (session.user as any).id, type: "PERMANENT" } }); }
  else if (action === "unban") { await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE", role: "MEMBER" } });
    await prisma.ban.updateMany({ where: { userId, isLifted: false }, data: { isLifted: true, liftedBy: (session.user as any).id, liftedAt: new Date() } }); }
  return NextResponse.json({ success: true });
}
