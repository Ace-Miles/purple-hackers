import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ count: 0 });
  const count = await prisma.notification.count({
    where: { userId: (session.user as any).id, isRead: false },
  });
  return NextResponse.json({ count });
}
