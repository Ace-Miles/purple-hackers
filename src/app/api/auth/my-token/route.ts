import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Returns the logged-in user's password reset token
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { passwordResetToken: true },
    });

    if (!user?.passwordResetToken) {
      return NextResponse.json({ error: "No reset token found" }, { status: 404 });
    }

    return NextResponse.json({ token: user.passwordResetToken });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
