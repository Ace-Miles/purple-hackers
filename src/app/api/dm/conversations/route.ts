import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List all DM conversations for the current user, with last message + other user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;

    const memberships = await prisma.chatRoomUser.findMany({
      where: { userId, room: { type: "DM" } },
      include: {
        room: {
          include: {
            members: { include: { user: { select: { id: true, username: true, avatar: true, role: true, verified: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    const conversations = memberships.map((m) => {
      const otherMember = m.room.members.find((mm) => mm.userId !== userId);
      const lastMessage = m.room.messages[0] || null;
      const lastReadAt = m.lastReadAt;
      const unread = lastMessage && (!lastReadAt || lastMessage.createdAt > lastReadAt) && lastMessage.userId !== userId;
      return {
        roomId: m.roomId,
        otherUser: otherMember?.user || null,
        lastMessage,
        unread: !!unread,
      };
    }).filter(c => c.otherUser).sort((a, b) => {
      const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });

    // Always include Purple AI at top if not already in conversations
    const hasPurpleAI = conversations.some(c => c.otherUser?.username === "PurpleAI");
    if (!hasPurpleAI) {
      const aiUser = await prisma.user.findUnique({
        where: { username: "PurpleAI" },
        select: { id: true, username: true, avatar: true, role: true, verified: true },
      }).catch(() => null);
      if (aiUser) {
        conversations.unshift({
          roomId: "" as string,
          otherUser: aiUser,
          lastMessage: null as any,
          unread: false,
        });
      }
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ conversations: [] });
  }
}
