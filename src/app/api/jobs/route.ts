import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const approved = searchParams.get("approved");
  const where: any = {};
  if (type && type !== "all") where.type = type;
  if (approved === "true") where.isApproved = true;
  if (approved === "false") where.isApproved = false;
  
  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { poster: { select: { id: true, username: true, avatar: true, roleTag: true, verified: true } } },
  });
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, company, description, type, location, url, salary, tags } = await req.json();
  if (!title || !company || !description) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  
  const role = (session.user as any).role;
  const isApproved = role === "ADMIN" || role === "FOUNDER" || role === "MODERATOR";
  
  const job = await prisma.job.create({
    data: {
      title, company, description, type: type || "full-time",
      location: location || "remote", url: url || "", salary: salary || "",
      tags: tags || [], postedBy: (session.user as any).id, isApproved,
    },
  });
  return NextResponse.json({ job }, { status: 201 });
}
