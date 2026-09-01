import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { type: { not: "DM" } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ rooms });
  } catch {
    return NextResponse.json({ rooms: [] });
  }
}
