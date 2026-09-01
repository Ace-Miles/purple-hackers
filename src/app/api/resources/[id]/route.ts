import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
  const role = (session.user as any).role;
  if (resource.submittedBy !== (session.user as any).id && role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
