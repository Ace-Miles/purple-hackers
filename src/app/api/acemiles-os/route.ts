import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Check connection status + fetch real tools from Acemiles OS
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { acemilesOsConnected: true as any, acemilesOsApiKey: true },
    });

    const connected = (user as any)?.acemilesOsConnected || false;
    const apiKey = (user as any)?.acemilesOsApiKey || null;

    if (!connected || !apiKey) {
      return NextResponse.json({ connected: false, tools: null });
    }

    // Fetch real tools from Acemiles OS
    try {
      const res = await fetch(`https://acemiles-os.vercel.app/api/external/tools?apiKey=${encodeURIComponent(apiKey)}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        return NextResponse.json({
          connected: true,
          apiKey,
          tools: null,
          error: data.error || "Acemiles OS returned an error — your key may be invalid. Generate a new one from Acemiles OS → API Access.",
        });
      }

      return NextResponse.json({
        connected: true,
        apiKey,
        tools: data.tools || [],
        categories: data.categories || [],
        user: data.user || null,
      });
    } catch (fetchErr) {
      return NextResponse.json({
        connected: true,
        apiKey,
        tools: null,
        error: "Could not reach Acemiles OS. Try again later.",
      });
    }
  } catch {
    return NextResponse.json({ connected: false, error: "Failed" }, { status: 500 });
  }
}

// POST — Connect with a user-provided Acemiles OS API key
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { apiKey: userApiKey } = await req.json();

    if (!userApiKey || !userApiKey.startsWith("ace_")) {
      return NextResponse.json({ error: "Invalid API key format. Keys start with 'ace_' — generate one from Acemiles OS → API Access." }, { status: 400 });
    }

    // Validate the key against Acemiles OS before saving
    try {
      const validateRes = await fetch(`https://acemiles-os.vercel.app/api/external/tools?apiKey=${encodeURIComponent(userApiKey)}`, {
        signal: AbortSignal.timeout(8000),
      });
      const validateData = await validateRes.json();

      if (!validateRes.ok || validateData.error) {
        return NextResponse.json({ error: validateData.error || "This API key is not valid on Acemiles OS." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Could not verify key with Acemiles OS. Try again." }, { status: 502 });
    }

    // Key is valid — save it
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { acemilesOsConnected: true as any, acemilesOsApiKey: userApiKey },
    });

    return NextResponse.json({
      success: true,
      message: "Connected to Acemiles OS! Loading tools...",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Disconnect from Acemiles OS
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { acemilesOsConnected: false as any, acemilesOsApiKey: null },
    });

    return NextResponse.json({ success: true, message: "Disconnected from Acemiles OS" });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
