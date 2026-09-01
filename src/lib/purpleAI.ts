// Shared Purple AI response helper — uses Groq's currently supported models
// (llama-3.3-70b-versatile and llama-3.1-8b-instant were decommissioned for
// the developer tier on Aug 16, 2026 — moved to openai/gpt-oss models with a fallback chain)

export const PURPLE_AI_SYSTEM_PROMPT = `You are Purple AI, the official AI assistant for the Purple Hackers community. You help members with:
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

const MODEL_CHAIN = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound-mini"];

export async function getPurpleAIResponse(message: string, extraSystemContext?: string): Promise<string> {
  const systemContent = extraSystemContext ? `${PURPLE_AI_SYSTEM_PROMPT}\n\n${extraSystemContext}` : PURPLE_AI_SYSTEM_PROMPT;

  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: message },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        // Try next model in the chain
        continue;
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch {
      continue;
    }
  }

  return "I'm having trouble connecting right now. Try again in a moment! 🤖";
}
