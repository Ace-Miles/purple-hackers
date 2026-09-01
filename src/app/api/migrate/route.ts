import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: string[] = [];

  try {
    const newColumns = [
      "ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS \"isFounder\" BOOLEAN DEFAULT false",
      "ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}'",
      "ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS \"acemilesOsConnected\" BOOLEAN DEFAULT false",
      "ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS \"acemilesOsApiKey\" TEXT",
    ];

    for (const sql of newColumns) {
      try { await prisma.$executeRawUnsafe(sql); results.push(`✓ ${sql.slice(0, 60)}...`); }
      catch (e: any) { results.push(`✗ ${e.message.slice(0, 80)}`); }
    }

    try {
      await prisma.$executeRawUnsafe("ALTER TYPE purple_hackers.\"Role\" ADD VALUE IF NOT EXISTS 'FOUNDER'");
      results.push("✓ FOUNDER role added to enum");
    } catch (e: any) { results.push(`⚠ Role enum: ${e.message.slice(0, 80)}`); }

    // Give admin/founder 999 reputation and Highly Skilled title (raw SQL to avoid enum caching issues)
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE purple_hackers.users 
        SET reputation = 999, 
            title = 'Highly Skilled', 
            "isFounder" = true, 
            role = 'ADMIN',
            badges = ARRAY['👑 Founder', '🏆 Legend', '💎 Diamond', '🔥 Trendsetter', '⭐ Expert']::TEXT[]
        WHERE email = 'admin@purplehackers.dev'
      `);
      results.push("✓ Founder updated: 999 rep, Highly Skilled, badges");
    } catch (e: any) { results.push(`✗ Founder update: ${e.message.slice(0, 100)}`); }

    // Add new chat rooms
    const newRooms = [
      { name: "Web Development", type: "PUBLIC" as const, description: "Frontend, backend, full-stack dev discussions", icon: "Code" },
      { name: "Cybersecurity Pros", type: "PUBLIC" as const, description: "Professional cybersecurity discussions & career advice", icon: "Shield" },
      { name: "Bug Bounty", type: "PUBLIC" as const, description: "Hunt bugs, share bounty tips, discuss programs", icon: "Bug" },
      { name: "CTF Challenges", type: "PUBLIC" as const, description: "Capture The Flag discussions and walkthroughs", icon: "Flag" },
      { name: "Programming", type: "PUBLIC" as const, description: "All languages — Python, C, Go, Rust, JS", icon: "Terminal" },
      { name: "Career Advice", type: "PUBLIC" as const, description: "Tech career guidance, interviews, resumes", icon: "Briefcase" },
      { name: "Memes & Fun", type: "PUBLIC" as const, description: "Hacker memes and off-topic fun", icon: "Coffee" },
      { name: "Dark Web Intel", type: "PUBLIC" as const, description: "Threat intel, dark web monitoring, breach news", icon: "Eye" },
    ];

    for (const room of newRooms) {
      const existing = await prisma.chatRoom.findFirst({ where: { name: room.name } });
      if (!existing) {
        await prisma.chatRoom.create({ data: room });
        results.push(`✓ Room created: ${room.name}`);
      } else {
        results.push(`→ Room exists: ${room.name}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, results }, { status: 500 });
  }
}
