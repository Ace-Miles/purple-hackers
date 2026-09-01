-- Purple Hackers Database Schema
-- This file is executed via the /api/setup endpoint on Vercel

-- ===== TYPES =====
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER', 'BANNED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chat_room_type AS ENUM ('PUBLIC', 'PRIVATE', 'DM', 'ANNOUNCEMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chat_role AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_target AS ENUM ('POST', 'COMMENT', 'USER', 'CHAT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM ('SPAM', 'HARASSMENT', 'ILLEGAL_CONTENT', 'MALWARE', 'NSFW', 'OFF_TOPIC', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ban_type AS ENUM ('TEMPORARY', 'PERMANENT', 'SHADOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== TABLES =====
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT,
  "username" TEXT UNIQUE NOT NULL,
  "avatar" TEXT DEFAULT '',
  "bio" TEXT DEFAULT '',
  "reputation" INTEGER DEFAULT 0,
  "role" user_role DEFAULT 'MEMBER',
  "status" user_status DEFAULT 'ACTIVE',
  "title" TEXT,
  "github" TEXT,
  "website" TEXT,
  "location" TEXT,
  "joinedAt" TIMESTAMP DEFAULT NOW(),
  "lastSeen" TIMESTAMP DEFAULT NOW(),
  "postsCount" INTEGER DEFAULT 0,
  "commentsCount" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT,
  "provider" TEXT,
  "providerAccountId" TEXT,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT DEFAULT '#a855f7',
  "order" INTEGER DEFAULT 0,
  "isLocked" BOOLEAN DEFAULT false,
  "postsCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "content" TEXT NOT NULL,
  "authorId" TEXT NOT NULL REFERENCES "users"("id"),
  "categoryId" TEXT NOT NULL REFERENCES "categories"("id"),
  "tags" TEXT[] DEFAULT '{}',
  "views" INTEGER DEFAULT 0,
  "upvotes" INTEGER DEFAULT 0,
  "downvotes" INTEGER DEFAULT 0,
  "isPinned" BOOLEAN DEFAULT false,
  "isLocked" BOOLEAN DEFAULT false,
  "isDeleted" BOOLEAN DEFAULT false,
  "editedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "posts_categoryId_idx" ON "posts"("categoryId");
CREATE INDEX IF NOT EXISTS "posts_authorId_idx" ON "posts"("authorId");

CREATE TABLE IF NOT EXISTS "comments" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "content" TEXT NOT NULL,
  "authorId" TEXT NOT NULL REFERENCES "users"("id"),
  "postId" TEXT NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "parentId" TEXT REFERENCES "comments"("id"),
  "upvotes" INTEGER DEFAULT 0,
  "downvotes" INTEGER DEFAULT 0,
  "isDeleted" BOOLEAN DEFAULT false,
  "editedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "comments_postId_idx" ON "comments"("postId");
CREATE INDEX IF NOT EXISTS "comments_authorId_idx" ON "comments"("authorId");

CREATE TABLE IF NOT EXISTS "reactions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "postId" TEXT REFERENCES "posts"("id") ON DELETE CASCADE,
  "commentId" TEXT REFERENCES "comments"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId", "postId"),
  UNIQUE("userId", "commentId")
);

CREATE TABLE IF NOT EXISTS "chat_rooms" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "type" chat_room_type DEFAULT 'PUBLIC',
  "description" TEXT,
  "icon" TEXT,
  "memberCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "chat_room_users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "roomId" TEXT NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" chat_role DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP DEFAULT NOW(),
  "lastReadAt" TIMESTAMP,
  UNIQUE("roomId", "userId")
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "content" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "roomId" TEXT NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
  "type" TEXT DEFAULT 'text',
  "isDeleted" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "chat_messages_roomId_idx" ON "chat_messages"("roomId");

CREATE TABLE IF NOT EXISTS "reports" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reporterId" TEXT NOT NULL REFERENCES "users"("id"),
  "targetType" report_target NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" report_reason NOT NULL,
  "description" TEXT,
  "status" report_status DEFAULT 'OPEN',
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP,
  "action" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "warnings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "issuedBy" TEXT NOT NULL,
  "points" INTEGER DEFAULT 1,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "bans" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "issuedBy" TEXT NOT NULL,
  "type" ban_type DEFAULT 'TEMPORARY',
  "expiresAt" TIMESTAMP,
  "isLifted" BOOLEAN DEFAULT false,
  "liftedBy" TEXT,
  "liftedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "link" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- ===== DEFAULT DATA =====
-- Default categories
INSERT INTO "categories" ("name", "slug", "description", "icon", "order") VALUES
  ('General Discussion', 'general', 'General hacking discussions, introductions, and community talk', 'MessageSquare', 1),
  ('Exploit Development', 'exploits', 'Zero-days, exploit writing, and vulnerability research', 'Bug', 2),
  ('Malware Analysis', 'malware', 'Reverse engineering, malware analysis, and AV evasion', 'Shield', 3),
  ('Cryptography', 'crypto', 'Crypto, hashing, ciphers, and breaking encryption', 'Lock', 4),
  ('OSINT', 'osint', 'Open source intelligence, reconnaissance, and data gathering', 'Search', 5),
  ('Network Security', 'network', 'Network attacks, defense, pentesting, and infrastructure', 'Network', 6),
  ('Web Security', 'websec', 'Web app security, XSS, SQLi, and web exploitation', 'Globe', 7),
  ('Tools & Scripts', 'tools', 'Share tools, scripts, and automation', 'Terminal', 8),
  ('Tutorials', 'tutorials', 'Learn and teach - guides, walkthroughs, and courses', 'BookOpen', 9),
  ('Off-Topic', 'offtopic', 'Anything that doesnt fit elsewhere', 'Coffee', 10)
ON CONFLICT ("slug") DO NOTHING;

-- Default chat rooms
INSERT INTO "chat_rooms" ("name", "type", "description", "icon") VALUES
  ('General', 'PUBLIC', 'General chat for everyone', 'Hash'),
  ('Exploit Lab', 'PUBLIC', 'Discuss exploits and vulnerabilities', 'Bug'),
  ('Crypto Corner', 'PUBLIC', 'Cryptography discussions', 'Lock'),
  ('OSINT Lounge', 'PUBLIC', 'Intelligence gathering chat', 'Search'),
  ('Help Desk', 'PUBLIC', 'Get help from the community', 'LifeBuoy'),
  ('Announcements', 'ANNOUNCEMENT', 'Official announcements', 'Megaphone')
ON CONFLICT DO NOTHING;

-- Enable realtime for chat
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_users;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

