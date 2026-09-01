import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ count: 0 });
    const userId = (session.user as any).id;

    const memberships = await prisma.chatRoomUser.findMany({
      where: { userId, room: { type: "DM" } },
      select: { roomId: true, lastReadAt: true },
    });

    let count = 0;
    for (const m of memberships) {
      const unread = await prisma.chatMessage.count({
        where: {
          roomId: m.roomId,
          userId: { not: userId },
          isDeleted: false,
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        },
      });
      if (unread > 0) count++;
    }

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
