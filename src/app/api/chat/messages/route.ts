import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processMentions } from "@/lib/mentions";
import { getPurpleAIResponse } from "@/lib/purpleAI";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    if (!roomId) return NextResponse.json({ messages: [] });

    const messages = await prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: { select: { id: true, username: true, avatar: true, role: true, title: true, isFounder: true } } },
    });

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });

    return NextResponse.json({ messages, room });
  } catch {
    return NextResponse.json({ messages: [], room: null });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, roomId, mediaUrl, type } = await req.json();
    if (!roomId) return NextResponse.json({ error: "Missing room" }, { status: 400 });
    if (!content?.trim() && !mediaUrl) return NextResponse.json({ error: "Missing content or media" }, { status: 400 });

    const myId = (session.user as any).id;
    const myUsername = (session.user as any).username;
    const trimmedContent = content?.trim() || "";

    const message = await prisma.chatMessage.create({
      data: {
        content: trimmedContent,
        mediaUrl: mediaUrl || null,
        type: type || (mediaUrl ? "media" : "text"),
        userId: myId,
        roomId,
      },
      include: { user: { select: { id: true, username: true, avatar: true, role: true, isFounder: true } } },
    });

    // Detect @mentions in the room and notify those users
    if (trimmedContent) {
      await processMentions({
        content: trimmedContent,
        actorId: myId,
        actorUsername: myUsername,
        notifTitle: `${myUsername} mentioned you in chat`,
        link: `/chat/${roomId}`,
      });
    }

    // If Purple AI was mentioned in the room, have it respond right in the room
    if (trimmedContent && /@PurpleAI\b/i.test(trimmedContent)) {
      const purpleAI = await prisma.user.findUnique({ where: { username: "PurpleAI" } });
      if (purpleAI) {
        const cleanQuestion = trimmedContent.replace(/@PurpleAI\b/gi, "").trim() || trimmedContent;
        const aiReply = await getPurpleAIResponse(cleanQuestion, "You were mentioned in a group chat room — respond directly and naturally, as if joining the conversation.");
        await prisma.chatMessage.create({
          data: {
            content: aiReply,
            type: "text",
            userId: purpleAI.id,
            roomId,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
