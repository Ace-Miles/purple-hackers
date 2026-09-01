import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// One-time convenience endpoint to (re)create the admin account. Protected by a secret query param.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "purplehackers-reset-2026") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const email = "admin@purplehackers.dev";
  const password = await bcrypt.hash("Admin123!", 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { password, role: "ADMIN", status: "ACTIVE" } });
    return NextResponse.json({ success: true, action: "updated", username: existing.username });
  }

  const user = await prisma.user.create({
    data: {
      email,
      password,
      username: "admin",
      role: "ADMIN",
      status: "ACTIVE",
      title: "Founder",
    },
  });
  return NextResponse.json({ success: true, action: "created", username: user.username });
}
