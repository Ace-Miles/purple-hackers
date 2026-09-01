import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    const myId = session ? (session.user as any).id : null;

    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "recent";
    const category = searchParams.get("category");
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10) || 0);
    const take = Math.min(50, Math.max(1, parseInt(searchParams.get("take") || "30", 10) || 30));

    const orderBy: any = sort === "top"
      ? [{ isPinned: "desc" }, { upvotes: "desc" }]
      : sort === "hot"
      ? [{ isPinned: "desc" }, { views: "desc" }]
      : [{ isPinned: "desc" }, { createdAt: "desc" }];

    const where: any = { isDeleted: false };
    if (category && category !== "all") {
      where.category = { slug: category };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          author: { select: { id: true, username: true, avatar: true, role: true, title: true, isFounder: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { comments: { where: { isDeleted: false } } } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    let myReactions: Record<string, string> = {};
    let followingSet = new Set<string>();

    if (myId && posts.length) {
      const postIds = posts.map(p => p.id);
      const authorIds = [...new Set(posts.map(p => p.authorId).filter(id => id !== myId))];

      const [reactions, follows] = await Promise.all([
        prisma.reaction.findMany({
          where: { userId: myId, postId: { in: postIds } },
          select: { postId: true, type: true },
        }),
        authorIds.length
          ? prisma.follow.findMany({
              where: { followerId: myId, followingId: { in: authorIds } },
              select: { followingId: true },
            })
          : Promise.resolve([]),
      ]);

      myReactions = Object.fromEntries(reactions.map(r => [r.postId as string, r.type]));
      followingSet = new Set(follows.map(f => f.followingId));
    }

    const enriched = posts.map(p => ({
      ...p,
      myReaction: myReactions[p.id] || null,
      isFollowingAuthor: p.authorId === myId ? null : followingSet.has(p.authorId),
      isOwnPost: p.authorId === myId,
    }));

    return NextResponse.json({ posts: enriched, total, hasMore: skip + posts.length < total });
  } catch (error) {
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, content, categorySlug, tags, mediaUrls } = await req.json();
    if (!title || (!content && !(mediaUrls?.length)) || !categorySlug) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (category.isLocked && (session.user as any).role !== "ADMIN" && (session.user as any).role !== "MODERATOR" && (session.user as any).role !== "FOUNDER") {
      return NextResponse.json({ error: "Category locked" }, { status: 403 });
    }

    const slug = `${Date.now().toString(36)}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}`;
    const post = await prisma.post.create({
      data: {
        title,
        content: content || "",
        mediaUrls: mediaUrls || [],
        slug,
        authorId: (session.user as any).id,
        categoryId: category.id,
        tags: tags || [],
      },
    });

    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { postsCount: { increment: 1 } },
    });
    await prisma.category.update({
      where: { id: category.id },
      data: { postsCount: { increment: 1 } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
