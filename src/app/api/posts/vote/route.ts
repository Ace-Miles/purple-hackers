import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { postId, type } = await req.json();
    if (!postId || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const existing = await prisma.reaction.findUnique({
      where: { userId_postId: { userId: (session.user as any).id, postId } },
    });

    if (existing) {
      if (existing.type === type) {
        // Remove vote
        await prisma.reaction.delete({ where: { id: existing.id } });
        await prisma.post.update({
          where: { id: postId },
          data: { [type === "up" ? "upvotes" : "downvotes"]: { decrement: 1 } },
        });
      } else {
        // Change vote
        await prisma.reaction.update({
          where: { id: existing.id },
          data: { type },
        });
        await prisma.post.update({
          where: { id: postId },
          data: {
            upvotes: { increment: type === "up" ? 1 : existing.type === "up" ? -1 : 0 },
            downvotes: { increment: type === "down" ? 1 : existing.type === "down" ? -1 : 0 },
          },
        });
      }
    } else {
      await prisma.reaction.create({
        data: { type, userId: (session.user as any).id, postId },
      });
      await prisma.post.update({
        where: { id: postId },
        data: { [type === "up" ? "upvotes" : "downvotes"]: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
