import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json().catch(() => ({}));
    if (body.confirm !== "DELETE") {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }

    // Careful, dependency-ordered cleanup so FK constraints don't block the delete.
    // 1. Detach any replies pointing at this user's comments (avoid self-relation FK issues)
    await prisma.$executeRawUnsafe(
      `UPDATE purple_hackers.comments SET "parentId" = NULL WHERE "parentId" IN (SELECT id FROM purple_hackers.comments WHERE "authorId" = $1)`,
      userId
    );
    // 2. Remove this user's own comments (their reactions cascade automatically)
    await prisma.$executeRawUnsafe(`DELETE FROM purple_hackers.comments WHERE "authorId" = $1`, userId);
    // 3. Remove reports they filed
    await prisma.$executeRawUnsafe(`DELETE FROM purple_hackers.reports WHERE "reporterId" = $1`, userId);
    // 4. Remove their posts (cascades remaining comments/reactions on those posts)
    await prisma.$executeRawUnsafe(`DELETE FROM purple_hackers.posts WHERE "authorId" = $1`, userId);
    // 5. Finally remove the user (cascades follows, notifications, sessions, accounts,
    //    chat memberships/messages, reactions, warnings, bans via existing schema cascades)
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 });
  }
}
