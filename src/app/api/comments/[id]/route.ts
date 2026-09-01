import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const isOwner = comment.authorId === userId;
    const isAdmin = role === "ADMIN" || role === "MODERATOR" || role === "FOUNDER";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.comment.update({ where: { id }, data: { isDeleted: true, content: "[deleted]" } });
    await prisma.user.update({ where: { id: comment.authorId }, data: { commentsCount: { decrement: 1 } } }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = (session.user as any).id;
    if (comment.authorId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

    const updated = await prisma.comment.update({ where: { id }, data: { content: content.trim(), editedAt: new Date() } });
    return NextResponse.json({ comment: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
