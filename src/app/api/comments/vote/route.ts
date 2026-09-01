import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndAwardVerified } from "@/lib/reputation";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId, type } = await req.json();
    if (!commentId || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const myId = (session.user as any).id;

    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, authorId: true, upvotes: true, downvotes: true } });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    // Ensure comment_reactions table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS purple_hackers.comment_reactions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        "commentId" TEXT NOT NULL REFERENCES purple_hackers.comments(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'up',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        UNIQUE("userId", "commentId")
      )
    `).catch(() => {});

    // Check existing reaction
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id, type FROM purple_hackers.comment_reactions WHERE "userId" = $1 AND "commentId" = $2 LIMIT 1`,
      myId, commentId
    ) as any[];

    if (existing.length > 0) {
      const prevType = existing[0].type;
      if (prevType === type) {
        // Remove vote
        await prisma.$executeRawUnsafe(
          `DELETE FROM purple_hackers.comment_reactions WHERE "userId" = $1 AND "commentId" = $2`,
          myId, commentId
        );
        const field = type === "up" ? "upvotes" : "downvotes";
        await prisma.$executeRawUnsafe(
          `UPDATE purple_hackers.comments SET "${field}" = GREATEST("${field}" - 1, 0) WHERE id = $1`,
          commentId
        );
        // Revert reputation
        if (type === "up" && comment.authorId !== myId) {
          await prisma.user.update({ where: { id: comment.authorId }, data: { reputation: { decrement: 1 } } }).catch(() => {});
        }
      } else {
        // Change vote
        await prisma.$executeRawUnsafe(
          `UPDATE purple_hackers.comment_reactions SET type = $3 WHERE "userId" = $1 AND "commentId" = $2`,
          myId, commentId, type
        );
        // Decrement old, increment new
        const oldField = prevType === "up" ? "upvotes" : "downvotes";
        const newField = type === "up" ? "upvotes" : "downvotes";
        await prisma.$executeRawUnsafe(
          `UPDATE purple_hackers.comments SET "${oldField}" = GREATEST("${oldField}" - 1, 0), "${newField}" = "${newField}" + 1 WHERE id = $1`,
          commentId
        );
        // Reputation: if changing to upvote give +1, if changing away from upvote take -1
        if (comment.authorId !== myId) {
          if (type === "up") {
            await prisma.user.update({ where: { id: comment.authorId }, data: { reputation: { increment: 1 } } }).catch(() => {});
        await checkAndAwardVerified(comment.authorId);
          } else if (prevType === "up") {
            await prisma.user.update({ where: { id: comment.authorId }, data: { reputation: { decrement: 1 } } }).catch(() => {});
          }
        }
      }
    } else {
      // New vote
      await prisma.$executeRawUnsafe(
        `INSERT INTO purple_hackers.comment_reactions (id, "userId", "commentId", type) VALUES (gen_random_uuid()::text, $1, $2, $3)`,
        myId, commentId, type
      );
      const field = type === "up" ? "upvotes" : "downvotes";
      await prisma.$executeRawUnsafe(
        `UPDATE purple_hackers.comments SET "${field}" = "${field}" + 1 WHERE id = $1`,
        commentId
      );
      // Reputation: +1 to comment author for upvote
      if (type === "up" && comment.authorId !== myId) {
        await prisma.user.update({ where: { id: comment.authorId }, data: { reputation: { increment: 1 } } }).catch(() => {});
        await checkAndAwardVerified(comment.authorId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
