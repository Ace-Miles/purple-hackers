import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const myId = (session.user as any).id;
    const myRole = (session.user as any).role;

    const msg = await prisma.chatMessage.findUnique({ where: { id }, select: { userId: true, roomId: true } });
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = msg.userId === myId;
    const isAdmin = myRole === "ADMIN" || myRole === "MODERATOR" || myRole === "FOUNDER";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.chatMessage.update({ where: { id }, data: { isDeleted: true, content: "[deleted]" } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
