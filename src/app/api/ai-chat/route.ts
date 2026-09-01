import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPurpleAIResponse } from "@/lib/purpleAI";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

  const reply = await getPurpleAIResponse(message);
  return NextResponse.json({ reply });
}
