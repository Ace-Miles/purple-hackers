import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "FOUNDER" && role !== "MODERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "FOUNDER" && role !== "MODERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await req.json();
  if (data.action === "approve") {
    await prisma.job.update({ where: { id }, data: { isApproved: true } });
  } else if (data.action === "reject") {
    await prisma.job.delete({ where: { id } });
  }
  return NextResponse.json({ success: true });
}
