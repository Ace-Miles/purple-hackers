import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndAwardVerified } from "@/lib/reputation";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { postId, type } = await req.json();
    if (!postId || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const myId = (session.user as any).id;

    // Get post author for reputation
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const existing = await prisma.reaction.findUnique({
      where: { userId_postId: { userId: myId, postId } },
    });

    if (existing) {
      if (existing.type === type) {
        // Remove vote — reverse reputation
        await prisma.reaction.delete({ where: { id: existing.id } });
        await prisma.post.update({
          where: { id: postId },
          data: { [type === "up" ? "upvotes" : "downvotes"]: { decrement: 1 } },
        });
        if (type === "up" && post.authorId !== myId) {
          await prisma.user.update({ where: { id: post.authorId }, data: { reputation: { decrement: 1 } } }).catch(() => {});
        }
      } else {
        // Change vote
        await prisma.reaction.update({ where: { id: existing.id }, data: { type } });
        await prisma.post.update({
          where: { id: postId },
          data: {
            upvotes: { increment: type === "up" ? 1 : existing.type === "up" ? -1 : 0 },
            downvotes: { increment: type === "down" ? 1 : existing.type === "down" ? -1 : 0 },
          },
        });
        // Reputation: if changing to upvote, give +1; if changing away from upvote, take -1
        if (post.authorId !== myId) {
          if (type === "up") {
            await prisma.user.update({ where: { id: post.authorId }, data: { reputation: { increment: 1 } } }).catch(() => {});
            await checkAndAwardVerified(post.authorId);
          } else if (existing.type === "up") {
            await prisma.user.update({ where: { id: post.authorId }, data: { reputation: { decrement: 1 } } }).catch(() => {});
          }
        }
      }
    } else {
      // New vote
      await prisma.reaction.create({ data: { type, userId: myId, postId } });
      await prisma.post.update({
        where: { id: postId },
        data: { [type === "up" ? "upvotes" : "downvotes"]: { increment: 1 } },
      });
      // Reputation: +1 to author for upvote
      if (type === "up" && post.authorId !== myId) {
        await prisma.user.update({ where: { id: post.authorId }, data: { reputation: { increment: 1 } } }).catch(() => {});
        await checkAndAwardVerified(post.authorId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
