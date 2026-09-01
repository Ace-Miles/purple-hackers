import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Email or username already taken" }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
    });

    // Auto-follow Acemiles (founder/admin) on registration
    // Only if the new user is NOT Acemiles themselves
    if (username.toLowerCase() !== "acemiles" && username.toLowerCase() !== "acemilex") {
      try {
        const founder = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: "Acemiles", mode: "insensitive" } },
              { email: "jameskamiles@gmail.com" },
            ],
          },
          select: { id: true, username: true },
        });

        // Also ensure the founder has admin+founder role
        if (founder) {
          await prisma.user.update({
            where: { id: founder.id },
            data: { role: "ADMIN", title: "Founder" },
          }).catch(() => {});
        }

        if (founder && founder.id !== user.id) {
          // Create follow relationship
          await prisma.follow.create({
            data: {
              followerId: user.id,
              followingId: founder.id,
            },
          }).catch(() => {}); // ignore if already exists

          // Increment counts
          await prisma.user.update({
            where: { id: user.id },
            data: { followingCount: { increment: 1 } },
          });
          await prisma.user.update({
            where: { id: founder.id },
            data: { followersCount: { increment: 1 } },
          });
        }
      } catch (e) {
        // Auto-follow is best-effort, don't fail registration
        console.error("Auto-follow failed:", e);
      }
    }

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
