import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `You are Purple AI, the official AI assistant for the Purple Hackers community. You help members with:
- Explaining community rules
- Guiding new members
- Answering questions about cybersecurity, programming, and ethical hacking
- Helping with tools and resources
- Being a friendly, knowledgeable companion

Rules:
- Always promote ethical hacking only
- Never help with illegal activities
- Be friendly, concise, and helpful
- Use a casual but professional tone
- If asked about community rules, reference the standard rules (respect, no illegal content, ethical hacking only, no spam, proper categories, credit sources, no doxxing, report don't retaliate)

Keep responses under 200 words unless asked for detail.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });
  
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    
    if (!res.ok) {
      // Fallback response
      return NextResponse.json({
        reply: "I'm having trouble connecting right now. Try again in a moment! 🤖",
      });
    }
    
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "I didn't catch that. Could you rephrase?";
    
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Try again in a moment! 🤖",
    });
  }
}
