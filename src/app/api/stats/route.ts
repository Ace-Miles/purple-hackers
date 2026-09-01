import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [users, posts, comments] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { isDeleted: false } }),
      prisma.comment.count({ where: { isDeleted: false } }),
    ]);
    return NextResponse.json({ users, posts, comments, online: 0 });
  } catch {
    return NextResponse.json({ users: 0, posts: 0, comments: 0, online: 0 });
  }
}
