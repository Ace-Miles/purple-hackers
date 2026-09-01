import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: string[] = [];

  try {
    // 1. Add new columns to users
    const userColumns = [
      `ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS "roleTag" TEXT`,
      `ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false`,
      `ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark'`,
      `ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS "referredBy" TEXT`,
      `ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS "referralCount" INTEGER DEFAULT 0`,
      `ALTER TABLE purple_hackers.users ADD COLUMN IF NOT EXISTS "referralCode" TEXT UNIQUE`,
    ];
    for (const sql of userColumns) {
      try { await prisma.$executeRawUnsafe(sql); results.push(`✓ ${sql.slice(0, 70)}`); }
      catch (e: any) { results.push(`✗ ${e.message.slice(0, 80)}`); }
    }

    // 2. Add isShowcase column to posts
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE purple_hackers.posts ADD COLUMN IF NOT EXISTS "isShowcase" BOOLEAN DEFAULT false`);
      results.push("✓ posts.isShowcase added");
    } catch (e: any) { results.push(`✗ posts.isShowcase: ${e.message.slice(0, 80)}`); }

    // 3. Create resources table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS purple_hackers.resources (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title TEXT NOT NULL,
          description TEXT,
          url TEXT NOT NULL,
          type TEXT DEFAULT 'tool',
          category TEXT DEFAULT 'general',
          "submittedBy" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
          "isPinned" BOOLEAN DEFAULT false,
          upvotes INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT now()
        )
      `);
      results.push("✓ resources table created");
    } catch (e: any) { results.push(`✗ resources: ${e.message.slice(0, 80)}`); }

    // 4. Create jobs table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS purple_hackers.jobs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title TEXT NOT NULL,
          company TEXT NOT NULL,
          description TEXT NOT NULL,
          type TEXT DEFAULT 'full-time',
          location TEXT DEFAULT 'remote',
          url TEXT,
          salary TEXT,
          tags TEXT[] DEFAULT '{}',
          "postedBy" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
          "isApproved" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT now()
        )
      `);
      results.push("✓ jobs table created");
    } catch (e: any) { results.push(`✗ jobs: ${e.message.slice(0, 80)}`); }

    // 5. Create referrals table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS purple_hackers.referrals (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "referrerId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
          "referredId" TEXT NOT NULL UNIQUE REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMP DEFAULT now()
        )
      `);
      results.push("✓ referrals table created");
    } catch (e: any) { results.push(`✗ referrals: ${e.message.slice(0, 80)}`); }

    // 6. Create rules table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS purple_hackers.rules (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          "order" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT now()
        )
      `);
      results.push("✓ rules table created");
    } catch (e: any) { results.push(`✗ rules: ${e.message.slice(0, 80)}`); }

    // 7. Update founder account
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE purple_hackers.users 
        SET reputation = 999, 
            title = 'Founder & Creator', 
            "isFounder" = true, 
            role = 'FOUNDER',
            verified = true,
            "roleTag" = 'Penetration Tester',
            badges = ARRAY['👑 Founder', '🏆 Legend', '💎 Diamond', '🔥 Trendsetter', '⭐ Expert', '✅ Verified', '💜 Purple O.G']::TEXT[]
        WHERE email = 'admin@purplehackers.dev'
      `);
      results.push("✓ Founder updated with v2 fields");
    } catch (e: any) { results.push(`✗ Founder update: ${e.message.slice(0, 100)}`); }

    // Also set jameskamiles@gmail.com as founder if exists
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE purple_hackers.users 
        SET "isFounder" = true, 
            role = 'FOUNDER',
            verified = true,
            reputation = GREATEST(reputation, 999),
            "roleTag" = COALESCE("roleTag", 'Penetration Tester'),
            badges = CASE 
              WHEN badges = '{}' THEN ARRAY['👑 Founder', '🏆 Legend', '✅ Verified']::TEXT[]
              ELSE badges
            END
        WHERE email = 'jameskamiles@gmail.com'
      `);
      results.push("✓ jameskamiles@gmail.com set as Founder");
    } catch (e: any) { results.push(`✗ jameskamiles update: ${e.message.slice(0, 80)}`); }

    // 8. Add FOUNDER role to enum if not exists
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE purple_hackers."Role" ADD VALUE IF NOT EXISTS 'FOUNDER'`);
      results.push("✓ FOUNDER role in enum");
    } catch (e: any) { results.push(`⚠ Role enum: ${e.message.slice(0, 80)}`); }

    // 9. Seed default rules
    const defaultRules = [
      { title: "Be Respectful", description: "Treat all members with respect. No harassment, hate speech, or personal attacks.", order: 1 },
      { title: "No Illegal Content", description: "No sharing of illegal tools, malware, stolen data, or anything that violates the law.", order: 2 },
      { title: "Ethical Hacking Only", description: "This community is for ethical hackers and security researchers. No black-hat activities.", order: 3 },
      { title: "No Spam", description: "No spamming, self-promotion without value, or excessive posting of low-quality content.", order: 4 },
      { title: "Use Categories Properly", description: "Post in the right category. Off-topic posts in serious categories will be moved.", order: 5 },
      { title: "Credit Your Sources", description: "Always credit the original author when sharing content, tools, or research.", order: 6 },
      { title: "No Doxxing", description: "Never share someone's personal information without consent. This is an instant ban.", order: 7 },
      { title: "Report, Don't Retaliate", description: "If you see something wrong, use the report button. Don't take matters into your own hands.", order: 8 },
    ];

    for (const rule of defaultRules) {
      const existing = await prisma.$queryRawUnsafe(`SELECT id FROM purple_hackers.rules WHERE title = $1`, rule.title) as any[];
      if (existing.length === 0) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO purple_hackers.rules (id, title, description, "order") VALUES (gen_random_uuid()::text, $1, $2, $3)`,
          rule.title, rule.description, rule.order
        );
        results.push(`✓ Rule seeded: ${rule.title}`);
      } else {
        results.push(`→ Rule exists: ${rule.title}`);
      }
    }

    // 10. Add showcase category
    const showcaseCat = await prisma.$queryRawUnsafe(`SELECT id FROM purple_hackers.categories WHERE slug = 'showcase'`) as any[];
    if (showcaseCat.length === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO purple_hackers.categories (id, name, slug, description, color, "order") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING`,
        "Project Showcase", "showcase", "Share what you're building! Weekly showcase thread.", "#a855f7", 0
      );
      results.push("✓ Showcase category created");
    } else {
      results.push("→ Showcase category exists");
    }

    // 11. Add AI chat room
    const aiRoom = await prisma.$queryRawUnsafe(`SELECT id FROM purple_hackers.chat_rooms WHERE name = 'Purple AI'`) as any[];
    if (aiRoom.length === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO purple_hackers.chat_rooms (id, name, type, description, icon) VALUES (gen_random_uuid()::text, $1, $2::purple_hackers."ChatRoomType", $3, $4)`,
        "Purple AI", "PUBLIC", "Chat with Purple AI — your community assistant. Ask about rules, get help, or just chat!", "Bot"
      );
      results.push("✓ Purple AI chat room created");
    } else {
      results.push("→ Purple AI room exists");
    }

    // 12. Generate referral codes for existing users
    try {
      const users = await prisma.$queryRawUnsafe(`SELECT id, username FROM purple_hackers.users WHERE "referralCode" IS NULL`) as any[];
      for (const u of users) {
        const code = `PH-${u.username.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        try {
          await prisma.$executeRawUnsafe(`UPDATE purple_hackers.users SET "referralCode" = $1 WHERE id = $2`, code, u.id);
        } catch {}
      }
      results.push(`✓ Referral codes generated for ${users.length} users`);
    } catch (e: any) { results.push(`✗ Referral codes: ${e.message.slice(0, 80)}`); }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, results }, { status: 500 });
  }
}
