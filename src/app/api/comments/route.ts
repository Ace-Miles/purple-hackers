import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, postId, parentId } = await req.json();
    if (!content || !postId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.isLocked) return NextResponse.json({ error: "Post locked" }, { status: 403 });

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: (session.user as any).id,
        postId,
        parentId: parentId || null,
      },
    });

    // Increment comments count AND reputation (+2 per comment)
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: {
        commentsCount: { increment: 1 },
        reputation: { increment: 2 },
      },
    });

    // Create notification for post author + give them +1 reputation for engagement
    if (post.authorId !== (session.user as any).id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "reply",
          title: "New comment on your post",
          content: content.slice(0, 100),
          link: `/forum/${post.categoryId}/${post.slug}`,
        },
      });
      await prisma.user.update({
        where: { id: post.authorId },
        data: { reputation: { increment: 1 } },
      }).catch(() => {});
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
