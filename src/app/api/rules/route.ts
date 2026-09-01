import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rules = await prisma.rule.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  const { title, description, order } = await req.json();
  if (!title || !description) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  
  const rule = await prisma.rule.create({ data: { title, description, order: order || 0 } });
  return NextResponse.json({ rule }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "FOUNDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.rule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
