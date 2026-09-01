import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    const myId = (session?.user as any)?.id || null;

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, avatar: true, role: true, reputation: true, title: true, joinedAt: true, isFounder: true, verified: true, roleTag: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!post || post.isDeleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});

    const comments = await prisma.comment.findMany({
      where: { postId: post.id, isDeleted: false, parentId: null },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, username: true, avatar: true, role: true, isFounder: true, verified: true, roleTag: true } },
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, username: true, avatar: true, role: true, isFounder: true, verified: true, roleTag: true } } },
        },
      },
    });

    // Get my reaction for the post
    let myReaction: string | null = null;
    if (myId) {
      const reaction = await prisma.reaction.findUnique({
        where: { userId_postId: { userId: myId, postId: post.id } },
        select: { type: true },
      }).catch(() => null);
      myReaction = reaction?.type || null;
    }

    // Get my reactions for comments
    let commentReactions: Record<string, string> = {};
    if (myId && comments.length > 0) {
      const commentIds = comments.flatMap((c: any) => [c.id, ...(c.replies?.map((r: any) => r.id) || [])]);
      if (commentIds.length > 0) {
        try {
          const reactions = await prisma.$queryRawUnsafe(
            `SELECT "commentId", type FROM purple_hackers.comment_reactions WHERE "userId" = $1 AND "commentId" = ANY($2::text[])`,
            myId, commentIds
          ) as any[];
          for (const r of reactions) {
            commentReactions[r.commentId] = r.type;
          }
        } catch {}
      }
    }

    // Attach myReaction to comments
    const commentsWithReactions = comments.map((c: any) => ({
      ...c,
      myReaction: commentReactions[c.id] || null,
      replies: c.replies?.map((r: any) => ({
        ...r,
        myReaction: commentReactions[r.id] || null,
      })) || [],
    }));

    return NextResponse.json({ post: { ...post, myReaction }, comments: commentsWithReactions });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const post = await prisma.post.findUnique({ where: { slug } });
    if (!post || post.isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const isOwner = post.authorId === userId;
    const isAdmin = role === "ADMIN" || role === "MODERATOR" || role === "FOUNDER";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data: any = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.content === "string") data.content = body.content;
    if (Array.isArray(body.mediaUrls)) data.mediaUrls = body.mediaUrls;
    if (Array.isArray(body.tags)) data.tags = body.tags;
    if (isAdmin && typeof body.isPinned === "boolean") data.isPinned = body.isPinned;
    if (isAdmin && typeof body.isLocked === "boolean") data.isLocked = body.isLocked;
    data.editedAt = new Date();

    const updated = await prisma.post.update({ where: { id: post.id }, data });
    return NextResponse.json({ post: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const post = await prisma.post.findUnique({ where: { slug } });
    if (!post || post.isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const isOwner = post.authorId === userId;
    const isAdmin = role === "ADMIN" || role === "MODERATOR" || role === "FOUNDER";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.post.update({ where: { id: post.id }, data: { isDeleted: true } });
    await prisma.category.update({ where: { id: post.categoryId }, data: { postsCount: { decrement: 1 } } }).catch(() => {});
    await prisma.user.update({ where: { id: post.authorId }, data: { postsCount: { decrement: 1 } } }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
