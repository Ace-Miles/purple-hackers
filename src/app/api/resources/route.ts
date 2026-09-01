import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const where: any = {};
  if (type && type !== "all") where.type = type;
  if (search) where.title = { contains: search, mode: "insensitive" };
  
  const resources = await prisma.resource.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { upvotes: "desc" }, { createdAt: "desc" }],
    include: { submitter: { select: { id: true, username: true, avatar: true, roleTag: true, verified: true } } },
  });
  return NextResponse.json({ resources });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, description, url, type, category } = await req.json();
  if (!title || !url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  
  const resource = await prisma.resource.create({
    data: {
      title, description: description || "", url, type: type || "tool",
      category: category || "general", submittedBy: (session.user as any).id,
    },
  });
  return NextResponse.json({ resource }, { status: 201 });
}
