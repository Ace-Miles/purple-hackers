import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    const session = await getServerSession(authOptions);

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, bio: true, reputation: true, role: true, title: true, github: true, website: true, location: true, postsCount: true, commentsCount: true, followersCount: true, followingCount: true, joinedAt: true, lastSeen: true, avatar: true, isFounder: true, badges: true, acemilesOsConnected: true, roleTag: true, verified: true, referralCode: true, referralCount: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const posts = await prisma.post.findMany({
      where: { authorId: user.id, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { category: { select: { slug: true, name: true } }, _count: { select: { comments: { where: { isDeleted: false } } } } },
    });

    let isFollowing = false;
    if (session && (session.user as any).id !== user.id) {
      const existing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: (session.user as any).id, followingId: user.id } },
      });
      isFollowing = !!existing;
    }

    return NextResponse.json({ user, posts, isFollowing });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
