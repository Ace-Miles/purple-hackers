import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// POST — Reset password using recovery token
export async function POST(req: Request) {
  try {
    const { token, newPassword, email } = await req.json();

    if (!token || !newPassword || !email) {
      return NextResponse.json({ error: "Token, email, and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        passwordResetToken: token,
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid token or email mismatch" }, { status: 403 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true, message: "Password reset successfully! You can now sign in." });
  } catch (error) {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}

// GET — Verify a token is valid (for the reset page to check before submitting)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        passwordResetToken: token,
      },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ valid: false }, { status: 403 });
    }

    return NextResponse.json({ valid: true, username: user.username });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
