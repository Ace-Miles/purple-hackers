import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — Execute a tool via Acemiles OS external API
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { acemilesOsConnected: true as any, acemilesOsApiKey: true },
    });

    if (!(user as any)?.acemilesOsConnected || !(user as any)?.acemilesOsApiKey) {
      return NextResponse.json({ error: "Not connected to Acemiles OS" }, { status: 403 });
    }

    const { toolId, target, category } = await req.json();
    if (!toolId || !target) return NextResponse.json({ error: "Tool ID and target required" }, { status: 400 });

    const apiKey = (user as any).acemilesOsApiKey;

    const res = await fetch("https://acemiles-os.vercel.app/api/external/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, toolId, target, category }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Execution failed" }, { status: 500 });
  }
}
