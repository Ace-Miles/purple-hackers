import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const message = await prisma.chatMessage.create({
      data: {
        content: content?.trim() || "",
        mediaUrl: mediaUrl || null,
        type: type || (mediaUrl ? "media" : "text"),
        userId: (session.user as any).id,
        roomId,
      },
      include: { user: { select: { id: true, username: true, avatar: true, role: true, isFounder: true } } },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
