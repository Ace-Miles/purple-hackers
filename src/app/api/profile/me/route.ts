import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { id: true, username: true, bio: true, title: true, github: true, website: true, location: true, avatar: true, reputation: true, role: true, isFounder: true, badges: true, roleTag: true, verified: true, theme: true, referralCode: true, referralCount: true },
  });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const allowed = ["bio", "title", "github", "website", "location", "avatar", "roleTag", "theme"];
  const updateData: any = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }
  await prisma.user.update({ where: { id: (session.user as any).id }, data: updateData });
  return NextResponse.json({ success: true });
}
