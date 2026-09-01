import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const myId = (session.user as any).id;

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === myId) return NextResponse.json({ error: "Can't follow yourself" }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: myId, followingId: target.id } },
  });

  if (existing) {
    // Unfollow
    await prisma.$transaction([
      prisma.follow.delete({ where: { id: existing.id } }),
      prisma.user.update({ where: { id: myId }, data: { followingCount: { decrement: 1 } } }),
      prisma.user.update({ where: { id: target.id }, data: { followersCount: { decrement: 1 } } }),
    ]);
    return NextResponse.json({ following: false });
  } else {
    // Follow
    await prisma.$transaction([
      prisma.follow.create({ data: { followerId: myId, followingId: target.id } }),
      prisma.user.update({ where: { id: myId }, data: { followingCount: { increment: 1 } } }),
      prisma.user.update({ where: { id: target.id }, data: { followersCount: { increment: 1 } } }),
    ]);

    // Notify the target user
    await prisma.notification.create({
      data: {
        userId: target.id,
        type: "FOLLOW",
        title: "New follower",
        content: `@${(session.user as any).username} started following you`,
        link: `/u/${(session.user as any).username}`,
      },
    }).catch(() => {});

    return NextResponse.json({ following: true });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await getServerSession(authOptions);
  const { username } = await params;

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let isFollowing = false;
  if (session) {
    const myId = (session.user as any).id;
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: myId, followingId: target.id } },
    });
    isFollowing = !!existing;
  }

  return NextResponse.json({
    isFollowing,
    followersCount: target.followersCount,
    followingCount: target.followingCount,
  });
}
