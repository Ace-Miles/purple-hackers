import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPurpleAIResponse } from "@/lib/purpleAI";

function dmRoomId(a: string, b: string) {
  return `dm_${[a, b].sort().join("_")}`;
}

async function getOrCreateRoom(myId: string, otherId: string, otherUsername: string) {
  const roomId = dmRoomId(myId, otherId);
  let room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    room = await prisma.chatRoom.create({
      data: {
        id: roomId,
        name: `DM`,
        type: "DM",
        memberCount: 2,
        members: {
          create: [
            { userId: myId },
            { userId: otherId },
          ],
        },
      },
    });
  }
  return room;
}

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const myId = (session.user as any).id;

    const { username } = await params;
    const otherUser = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, avatar: true, role: true, status: true, verified: true } });
    if (!otherUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (otherUser.id === myId) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

    const room = await getOrCreateRoom(myId, otherUser.id, otherUser.username);

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId: room.id,
        isDeleted: false,
        ...(since ? { createdAt: { gt: new Date(Number(since)) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { user: { select: { id: true, username: true, avatar: true, role: true } } },
    });

    await prisma.chatRoomUser.updateMany({
      where: { roomId: room.id, userId: myId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ messages, otherUser, roomId: room.id });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const myId = (session.user as any).id;

    const { username } = await params;
    const otherUser = await prisma.user.findUnique({ where: { username } });
    if (!otherUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (otherUser.id === myId) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

    const { content, mediaUrl, type } = await req.json();
    if (!content?.trim() && !mediaUrl) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const room = await getOrCreateRoom(myId, otherUser.id, otherUser.username);

    const message = await prisma.chatMessage.create({
      data: {
        content: content?.trim() || "",
        mediaUrl: mediaUrl || null,
        type: mediaUrl ? "media" : "text",
        userId: myId,
        roomId: room.id,
      },
      include: { user: { select: { id: true, username: true, avatar: true, role: true } } },
    });

    // If messaging Purple AI, trigger AI response
    const isPurpleAI = otherUser.username === "PurpleAI";
    if (isPurpleAI && content?.trim()) {
      // Don't send notification to the AI user — instead trigger AI response
      const aiReply = await getPurpleAIResponse(content.trim());
      await prisma.chatMessage.create({
        data: {
          content: aiReply,
          type: "text",
          userId: otherUser.id,
          roomId: room.id,
        },
      });
    } else {
      // Normal notification
      await prisma.notification.create({
        data: {
          userId: otherUser.id,
          type: "dm",
          title: `New message from ${(session.user as any).username}`,
          content: mediaUrl ? "📷 Sent a photo" : content.slice(0, 100),
          link: `/messages/${(session.user as any).username}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
