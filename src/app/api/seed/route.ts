import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = [
      { name: "General Discussion", slug: "general", description: "General hacking discussions", icon: "MessageSquare", order: 1 },
      { name: "Exploit Development", slug: "exploits", description: "Zero-days, exploit writing, and vulnerability research", icon: "Bug", order: 2 },
      { name: "Malware Analysis", slug: "malware", description: "Reverse engineering, malware analysis, and AV evasion", icon: "Shield", order: 3 },
      { name: "Cryptography", slug: "crypto", description: "Crypto, hashing, ciphers, and breaking encryption", icon: "Lock", order: 4 },
      { name: "OSINT", slug: "osint", description: "Open source intelligence, reconnaissance, and data gathering", icon: "Search", order: 5 },
      { name: "Network Security", slug: "network", description: "Network attacks, defense, pentesting, and infrastructure", icon: "Network", order: 6 },
      { name: "Web Security", slug: "websec", description: "Web app security, XSS, SQLi, and web exploitation", icon: "Globe", order: 7 },
      { name: "Tools & Scripts", slug: "tools", description: "Share tools, scripts, and automation", icon: "Terminal", order: 8 },
      { name: "Tutorials", slug: "tutorials", description: "Learn and teach - guides, walkthroughs, and courses", icon: "BookOpen", order: 9 },
      { name: "Off-Topic", slug: "offtopic", description: "Anything that doesnt fit elsewhere", icon: "Coffee", order: 10 },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: cat,
      });
    }

    const rooms = [
      { name: "General", type: "PUBLIC" as const, description: "General chat for everyone", icon: "Hash" },
      { name: "Exploit Lab", type: "PUBLIC" as const, description: "Discuss exploits and vulnerabilities", icon: "Bug" },
      { name: "Crypto Corner", type: "PUBLIC" as const, description: "Cryptography discussions", icon: "Lock" },
      { name: "OSINT Lounge", type: "PUBLIC" as const, description: "Intelligence gathering chat", icon: "Search" },
      { name: "Help Desk", type: "PUBLIC" as const, description: "Get help from the community", icon: "LifeBuoy" },
      { name: "Announcements", type: "ANNOUNCEMENT" as const, description: "Official announcements", icon: "Megaphone" },
      { name: "Web Development", type: "PUBLIC" as const, description: "Frontend, backend, full-stack dev discussions", icon: "Code" },
      { name: "Cybersecurity Pros", type: "PUBLIC" as const, description: "Professional cybersecurity discussions & career advice", icon: "Shield" },
      { name: "Bug Bounty", type: "PUBLIC" as const, description: "Hunt bugs, share bounty tips, discuss programs", icon: "Bug" },
      { name: "CTF Challenges", type: "PUBLIC" as const, description: "Capture The Flag discussions and walkthroughs", icon: "Flag" },
      { name: "Programming", type: "PUBLIC" as const, description: "All languages — Python, C, Go, Rust, JS", icon: "Terminal" },
      { name: "Career Advice", type: "PUBLIC" as const, description: "Tech career guidance, interviews, resumes", icon: "Briefcase" },
      { name: "Memes & Fun", type: "PUBLIC" as const, description: "Hacker memes and off-topic fun", icon: "Coffee" },
      { name: "Dark Web Intel", type: "PUBLIC" as const, description: "Threat intel, dark web monitoring, breach news", icon: "Eye" },
    ];

    for (const room of rooms) {
      const existing = await prisma.chatRoom.findFirst({ where: { name: room.name } });
      if (!existing) await prisma.chatRoom.create({ data: room });
    }

    const catCount = await prisma.category.count();
    const roomCount = await prisma.chatRoom.count();
    return NextResponse.json({ success: true, categories: catCount, chatRooms: roomCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
