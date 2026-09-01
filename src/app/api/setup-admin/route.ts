import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * One-time setup: create storage bucket, set Acemiles as Admin + Founder.
 * Admin-only. Can be called once after deployment.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any)?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetUsername = body.username || (session.user as any)?.username;

    // Set user as ADMIN with title "Founder"
    const updated = await prisma.user.update({
      where: { username: targetUsername },
      data: { role: "ADMIN", title: "Founder" },
      select: { id: true, username: true, role: true, title: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message?.slice(0, 300) }, { status: 500 });
  }
}
