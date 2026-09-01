import { NextResponse } from "next/server";
import { Pool } from "pg";

export const maxDuration = 30;

export async function GET() {
  const conn = "postgresql://postgres.bhskhsocmjzahqfvfoml:08030789462Jj.@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
  
  try {
    const pool = new Pool({ 
      connectionString: conn, 
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();
    
    // Create schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS purple_hackers`);
    
    // Drop existing tables (clean slate)
    await client.query(`
      DROP TABLE IF EXISTS purple_hackers.notifications CASCADE;
      DROP TABLE IF EXISTS purple_hackers.bans CASCADE;
      DROP TABLE IF EXISTS purple_hackers.warnings CASCADE;
      DROP TABLE IF EXISTS purple_hackers.reports CASCADE;
      DROP TABLE IF EXISTS purple_hackers.reactions CASCADE;
      DROP TABLE IF EXISTS purple_hackers.chat_messages CASCADE;
      DROP TABLE IF EXISTS purple_hackers.chat_room_users CASCADE;
      DROP TABLE IF EXISTS purple_hackers.chat_rooms CASCADE;
      DROP TABLE IF EXISTS purple_hackers.comments CASCADE;
      DROP TABLE IF EXISTS purple_hackers.posts CASCADE;
      DROP TABLE IF EXISTS purple_hackers.categories CASCADE;
      DROP TABLE IF EXISTS purple_hackers.sessions CASCADE;
      DROP TABLE IF EXISTS purple_hackers.accounts CASCADE;
      DROP TABLE IF EXISTS purple_hackers.users CASCADE;
    `);
    
    // Drop existing enums
    await client.query(`
      DROP TYPE IF EXISTS purple_hackers."Role" CASCADE;
      DROP TYPE IF EXISTS purple_hackers."Status" CASCADE;
      DROP TYPE IF EXISTS purple_hackers."ChatRoomType" CASCADE;
      DROP TYPE IF EXISTS purple_hackers."ChatRole" CASCADE;
      DROP TYPE IF EXISTS purple_hackers."ReportTarget" CASCADE;
      DROP TYPE IF EXISTS purple_hackers."ReportReason" CASCADE;
      DROP TYPE IF EXISTS purple_hackers."ReportStatus" CASCADE;
      DROP TYPE IF EXISTS purple_hackers."BanType" CASCADE;
    `);
    
    // Create enums
    await client.query(`CREATE TYPE purple_hackers."Role" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER', 'BANNED')`);
    await client.query(`CREATE TYPE purple_hackers."Status" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE')`);
    await client.query(`CREATE TYPE purple_hackers."ChatRoomType" AS ENUM ('PUBLIC', 'PRIVATE', 'DM', 'ANNOUNCEMENT')`);
    await client.query(`CREATE TYPE purple_hackers."ChatRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN')`);
    await client.query(`CREATE TYPE purple_hackers."ReportTarget" AS ENUM ('POST', 'COMMENT', 'USER', 'CHAT')`);
    await client.query(`CREATE TYPE purple_hackers."ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'ILLEGAL_CONTENT', 'MALWARE', 'NSFW', 'OFF_TOPIC', 'OTHER')`);
    await client.query(`CREATE TYPE purple_hackers."ReportStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')`);
    await client.query(`CREATE TYPE purple_hackers."BanType" AS ENUM ('TEMPORARY', 'PERMANENT', 'SHADOW')`);
    
    // Create users table
    await client.query(`
      CREATE TABLE purple_hackers.users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        username TEXT NOT NULL UNIQUE,
        avatar TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        reputation INTEGER NOT NULL DEFAULT 0,
        role purple_hackers."Role" NOT NULL DEFAULT 'MEMBER',
        status purple_hackers."Status" NOT NULL DEFAULT 'ACTIVE',
        title TEXT,
        github TEXT,
        website TEXT,
        location TEXT,
        "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "lastSeen" TIMESTAMPTZ DEFAULT NOW(),
        "postsCount" INTEGER NOT NULL DEFAULT 0,
        "commentsCount" INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Create accounts table
    await client.query(`
      CREATE TABLE purple_hackers.accounts (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        UNIQUE(provider, "providerAccountId")
      )
    `);
    
    // Create sessions table
    await client.query(`
      CREATE TABLE purple_hackers.sessions (
        id TEXT PRIMARY KEY,
        "sessionToken" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL
      )
    `);
    
    // Create categories table
    await client.query(`
      CREATE TABLE purple_hackers.categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        color TEXT NOT NULL DEFAULT '#a855f7',
        "order" INTEGER NOT NULL DEFAULT 0,
        "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
        "postsCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create posts table
    await client.query(`
      CREATE TABLE purple_hackers.posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        "authorId" TEXT NOT NULL REFERENCES purple_hackers.users(id),
        "categoryId" TEXT NOT NULL REFERENCES purple_hackers.categories(id),
        tags TEXT[] DEFAULT '{}',
        views INTEGER NOT NULL DEFAULT 0,
        upvotes INTEGER NOT NULL DEFAULT 0,
        downvotes INTEGER NOT NULL DEFAULT 0,
        "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
        "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
        "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "editedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX idx_posts_category ON purple_hackers.posts("categoryId")`);
    await client.query(`CREATE INDEX idx_posts_author ON purple_hackers.posts("authorId")`);
    
    // Create comments table
    await client.query(`
      CREATE TABLE purple_hackers.comments (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        "authorId" TEXT NOT NULL REFERENCES purple_hackers.users(id),
        "postId" TEXT NOT NULL REFERENCES purple_hackers.posts(id) ON DELETE CASCADE,
        "parentId" TEXT REFERENCES purple_hackers.comments(id),
        upvotes INTEGER NOT NULL DEFAULT 0,
        downvotes INTEGER NOT NULL DEFAULT 0,
        "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "editedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX idx_comments_post ON purple_hackers.comments("postId")`);
    await client.query(`CREATE INDEX idx_comments_author ON purple_hackers.comments("authorId")`);
    
    // Create reactions table
    await client.query(`
      CREATE TABLE purple_hackers.reactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        "postId" TEXT REFERENCES purple_hackers.posts(id) ON DELETE CASCADE,
        "commentId" TEXT REFERENCES purple_hackers.comments(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("userId", "postId"),
        UNIQUE("userId", "commentId")
      )
    `);
    
    // Create chat_rooms table
    await client.query(`
      CREATE TABLE purple_hackers.chat_rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type purple_hackers."ChatRoomType" NOT NULL DEFAULT 'PUBLIC',
        description TEXT,
        icon TEXT,
        "memberCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create chat_room_users table
    await client.query(`
      CREATE TABLE purple_hackers.chat_room_users (
        id TEXT PRIMARY KEY,
        "roomId" TEXT NOT NULL REFERENCES purple_hackers.chat_rooms(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        role purple_hackers."ChatRole" NOT NULL DEFAULT 'MEMBER',
        "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "lastReadAt" TIMESTAMPTZ,
        UNIQUE("roomId", "userId")
      )
    `);
    
    // Create chat_messages table
    await client.query(`
      CREATE TABLE purple_hackers.chat_messages (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        "roomId" TEXT NOT NULL REFERENCES purple_hackers.chat_rooms(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'text',
        "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX idx_chat_messages_room ON purple_hackers.chat_messages("roomId")`);
    
    // Create reports table
    await client.query(`
      CREATE TABLE purple_hackers.reports (
        id TEXT PRIMARY KEY,
        "reporterId" TEXT NOT NULL REFERENCES purple_hackers.users(id),
        "targetType" purple_hackers."ReportTarget" NOT NULL,
        "targetId" TEXT NOT NULL,
        reason purple_hackers."ReportReason" NOT NULL,
        description TEXT,
        status purple_hackers."ReportStatus" NOT NULL DEFAULT 'OPEN',
        "resolvedBy" TEXT,
        "resolvedAt" TIMESTAMPTZ,
        action TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create warnings table
    await client.query(`
      CREATE TABLE purple_hackers.warnings (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        "issuedBy" TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 1,
        "expiresAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create bans table
    await client.query(`
      CREATE TABLE purple_hackers.bans (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        "issuedBy" TEXT NOT NULL,
        type purple_hackers."BanType" NOT NULL DEFAULT 'TEMPORARY',
        "expiresAt" TIMESTAMPTZ,
        "isLifted" BOOLEAN NOT NULL DEFAULT FALSE,
        "liftedBy" TEXT,
        "liftedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create notifications table
    await client.query(`
      CREATE TABLE purple_hackers.notifications (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES purple_hackers.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        link TEXT,
        "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Seed categories
    const categories = [
      { name: 'Exploits', slug: 'exploits', icon: 'Bug', desc: 'Zero-days, vulnerabilities, and exploit development' },
      { name: 'Malware Analysis', slug: 'malware', icon: 'Shield', desc: 'Reverse engineering, malware analysis, and detection' },
      { name: 'Cryptography', slug: 'crypto', icon: 'Lock', desc: 'Cryptography, hashing, and crypto attacks' },
      { name: 'OSINT', slug: 'osint', icon: 'Search', desc: 'Open source intelligence gathering' },
      { name: 'Web Security', slug: 'websec', icon: 'Code2', desc: 'XSS, SQLi, CSRF, and web app security' },
      { name: 'Network Security', slug: 'network', icon: 'Globe', desc: 'Network pentesting and infrastructure security' },
      { name: 'Tools', slug: 'tools', icon: 'Terminal', desc: 'Share and discuss security tools' },
      { name: 'Tutorials', slug: 'tutorials', icon: 'BookOpen', desc: 'Guides, courses, and learning resources' },
      { name: 'General Discussion', slug: 'general', icon: 'MessageSquare', desc: 'General community discussion' },
      { name: 'Off-Topic', slug: 'offtopic', icon: 'Coffee', desc: 'Everything else' },
    ];
    
    for (let i = 0; i < categories.length; i++) {
      await client.query(
        `INSERT INTO purple_hackers.categories (id, name, slug, description, icon, "order") VALUES ($1, $2, $3, $4, $5, $6)`,
        [`cat_${categories[i].slug}`, categories[i].name, categories[i].slug, categories[i].desc, categories[i].icon, i]
      );
    }
    
    // Create default chat rooms
    const rooms = [
      { id: 'room_general', name: 'General', desc: 'General community chat' },
      { id: 'room_exploits', name: 'Exploit Dev', desc: 'Exploit development discussion' },
      { id: 'room_malware', name: 'Malware Lab', desc: 'Malware analysis and RE' },
      { id: 'room_help', name: 'Help Desk', desc: 'Get help from the community' },
    ];
    
    for (const room of rooms) {
      await client.query(
        `INSERT INTO purple_hackers.chat_rooms (id, name, description, type) VALUES ($1, $2, $3, 'PUBLIC')`,
        [room.id, room.name, room.desc]
      );
    }
    
    // Create an admin user
    const bcrypt = require('bcryptjs');
    const adminPass = await bcrypt.hash('Admin123!', 10);
    await client.query(
      `INSERT INTO purple_hackers.users (id, name, email, password, username, role, status, reputation, title) 
       VALUES ($1, $2, $3, $4, $5, 'ADMIN', 'ACTIVE', 999, 'Founder')`,
      ['user_admin_001', 'Admin', 'admin@purplehackers.dev', adminPass, 'admin']
    );
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'purple_hackers' ORDER BY table_name
    `);
    
    client.release();
    await pool.end();
    
    return NextResponse.json({ 
      success: true, 
      message: "All tables created and seeded",
      tables: result.rows.map((r: any) => r.table_name),
      adminUser: { username: 'admin', password: 'Admin123!', email: 'admin@purplehackers.dev' }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message?.slice(0, 500),
      stack: error.stack?.slice(0, 300)
    }, { status: 500 });
  }
}
