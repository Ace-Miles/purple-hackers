import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { targetId, targetType, reason, description } = await req.json();
  if (!targetId || !targetType || !reason) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  
  // Prevent self-reporting
  if (targetType === "USER") {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (target?.id === (session.user as any).id) {
      return NextResponse.json({ error: "Can't report yourself" }, { status: 400 });
    }
  }
  
  // Check if already reported by this user
  const existing = await prisma.report.findFirst({
    where: { reporterId: (session.user as any).id, targetId, targetType: targetType as any },
  });
  if (existing) return NextResponse.json({ error: "Already reported" }, { status: 409 });
  
  const report = await prisma.report.create({
    data: {
      reporterId: (session.user as any).id,
      targetId,
      targetType: targetType as any,
      reason: reason as any,
      description: description || "",
    },
  });
  
  return NextResponse.json({ report }, { status: 201 });
}
