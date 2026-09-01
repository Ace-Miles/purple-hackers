import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reports = await prisma.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ reports });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, action } = await req.json();
  await prisma.report.update({ where: { id }, data: {
    status: action === "resolve" ? "RESOLVED" : "DISMISSED",
    resolvedBy: (session.user as any).id, resolvedAt: new Date(),
  }});
  return NextResponse.json({ success: true });
}
