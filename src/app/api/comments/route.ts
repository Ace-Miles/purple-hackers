import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndAwardVerified } from "@/lib/reputation";
import { processMentions } from "@/lib/mentions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, postId, parentId } = await req.json();
    if (!content || !postId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const post = await prisma.post.findUnique({ where: { id: postId }, include: { category: { select: { slug: true } } } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.isLocked) return NextResponse.json({ error: "Post locked" }, { status: 403 });

    const myId = (session.user as any).id;
    const myUsername = (session.user as any).username;

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: myId,
        postId,
        parentId: parentId || null,
      },
    });

    const postLink = `/forum/${post.category.slug}/${post.slug}`;

    // Increment comments count AND reputation (+2 per comment)
    await prisma.user.update({
      where: { id: myId },
      data: {
        commentsCount: { increment: 1 },
        reputation: { increment: 2 },
      },
    });
    await checkAndAwardVerified(myId);

    // Create notification for post author + give them +1 reputation for engagement
    if (post.authorId !== myId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "reply",
          title: "New comment on your post",
          content: content.slice(0, 100),
          link: postLink,
        },
      });
      await prisma.user.update({
        where: { id: post.authorId },
        data: { reputation: { increment: 1 } },
      }).catch(() => {});
      await checkAndAwardVerified(post.authorId);
    }

    // If this is a reply to another comment, notify that comment's author too (unless it's the post author, already notified)
    let excludeIds = [myId];
    if (post.authorId !== myId) excludeIds.push(post.authorId);
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId }, select: { authorId: true } });
      if (parentComment && parentComment.authorId !== myId && !excludeIds.includes(parentComment.authorId)) {
        await prisma.notification.create({
          data: {
            userId: parentComment.authorId,
            type: "reply",
            title: `${myUsername} replied to your comment`,
            content: content.slice(0, 100),
            link: postLink,
          },
        }).catch(() => {});
        excludeIds.push(parentComment.authorId);
      }
    }

    // Detect @mentions and notify those users
    await processMentions({
      content,
      actorId: myId,
      actorUsername: myUsername,
      excludeUserIds: excludeIds,
      notifTitle: `${myUsername} mentioned you in a comment`,
      link: postLink,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
