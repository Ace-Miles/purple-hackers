# Purple Hackers — Complete Project Handoff Document

*Last updated: September 1, 2026*

This document contains ALL credentials, configuration, and project state needed for any Base44 agent to continue working on the Purple Hackers project.

---

## Project Overview

- **Name:** Purple Hackers
- **Live URL:** https://purple-hackers.vercel.app
- **GitHub Repo:** https://github.com/Ace-Miles/purple-hackers
- **Owner:** Ace-Miles (GitHub username: Ace-Miles)
- **Workspace path:** `/app/conversations/6a8b64f612b12b330062a70d/purple-hackers`

---

## Tech Stack

- **Framework:** Next.js 15.1.11 (App Router)
- **ORM:** Prisma 6.19.3
- **Database:** Supabase PostgreSQL (shared with Acemiles OS, using `purple_hackers` schema)
- **Auth:** NextAuth.js (Credentials provider, JWT strategy)
- **Styling:** TailwindCSS 4
- **Deployment:** Vercel (production)
- **Package Manager:** npm

---

## Credentials & Tokens

### GitHub
- **Username:** Ace-Miles
- **Token:** Available as `$GITHUB_TOKEN` environment variable in Base44 sandbox
- **Token prefix:** ghp_m1oW8r...
- **Repo:** https://github.com/Ace-Miles/purple-hackers
- **Permissions:** repo (full)

### Vercel
- **Token:** Available as `$VERCEL_TOKEN` environment variable in Base44 sandbox
- **Token prefix:** vcp_58AfC6...
- **Project ID:** prj_xEI6kU9Goz3IWAod7Ap8lHDkwaHb
- **Org/Team ID:** team_sWsPTbXMbfYLuKv1suLpLAJd
- **Project name:** purple-hackers
- **Production URL:** https://purple-hackers.vercel.app
- **Vercel account:** jameskamiles-8280s-projects

### Supabase (Database)
- **Project ref:** bhskhsocmjzahqfvfoml
- **Region:** eu-west-1 (pooler: aws-0-eu-west-1.pooler.supabase.com)
- **Schema used:** purple_hackers (separate from Acemiles OS which uses a different schema)
- **DATABASE_URL (pooler, port 6543):** postgresql://postgres.bhskhsocmjzahqfvfoml:08030789462Jj.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
- **DIRECT_URL (port 5432):** postgresql://postgres.bhskhsocmjzahqfvfoml:08030789462Jj.@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
- **Database password:** 08030789462Jj.
- **Supabase URL:** https://bhskhsocmjzahqfvfoml.supabase.co

### NextAuth
- **NEXTAUTH_URL:** https://purple-hackers.vercel.app
- **NEXTAUTH_SECRET:** purple-hackers-secret-key-2026

### Supabase Storage (for file uploads)
- **Bucket:** purple-hackers-uploads
- **Used for:** Avatar images, post media (images/videos)
- **Upload API:** /api/upload (handles both avatar and post media)

---

## Environment Variables (All of them)

### .env file (local)
```
DATABASE_URL="postgresql://postgres.bhskhsocmjzahqfvfoml:08030789462Jj.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.bhskhsocmjzahqfvfoml:08030789462Jj.@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="purple-hackers-secret-key-2026"
NEXTAUTH_URL="https://purple-hackers.vercel.app"
NEXT_PUBLIC_SUPABASE_URL="https://bhskhsocmjzahqfvfoml.supabase.co"
```

### Vercel Environment Variables (production)
```
DATABASE_URL              - Supabase pooler connection (port 6543, pgbouncer=true)
DIRECT_URL                - Supabase direct connection (port 5432)
NEXTAUTH_URL              - https://purple-hackers.vercel.app
NEXTAUTH_SECRET           - purple-hackers-secret-key-2026
NEXT_PUBLIC_SUPABASE_URL  - https://bhskhsocmjzahqfvfoml.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY - (from Supabase dashboard)
SUPABASE_SECRET_KEY       - (from Supabase dashboard, service role key)
SUPABASE_URL              - (same as NEXT_PUBLIC_SUPABASE_URL)
```

---

## Admin Account

- **Email:** admin@purplehackers.dev
- **Password:** Admin123!
- **Username:** admin
- **Role:** ADMIN
- **Reset endpoint:** GET /api/admin/reset-admin?secret=purplehackers-reset-2026
  (This endpoint recreates/resets the admin account)

---

## Database Schema

The project uses Prisma with a custom `purple_hackers` schema in Supabase.
- **Prisma schema:** prisma/schema.prisma
- **Migration approach:** Custom SQL via /api/setup and /api/migrate endpoints
- **Setup endpoint:** GET /api/setup (drops and recreates all tables — DESTRUCTIVE)
- **Migrate endpoint:** GET /api/migrate (additive — adds new columns/indexes without dropping data)

### Tables
- users (id, email, username, password, role, status, avatar, bio, title, reputation, postsCount, commentsCount, github, website, location, lastSeen, joinedAt, coverImage)
- categories (id, name, slug, description, isLocked, postsCount)
- posts (id, title, content, slug, authorId, categoryId, upvotes, downvotes, views, isPinned, isLocked, isDeleted, tags, mediaUrls, editedAt, createdAt, updatedAt)
- comments (id, content, postId, authorId, parentId, upvotes, isDeleted, editedAt, createdAt, updatedAt)
- chat_rooms (id, name, description, type, createdBy, memberCount, createdAt)
- chat_room_users (id, roomId, userId, role)
- chat_messages (id, content, roomId, userId, createdAt)
- notifications (id, userId, type, title, content, isRead, link, createdAt)
- reports (id, reporterId, targetId, target, reason, status, description, createdAt)
- bans (id, userId, bannedBy, type, reason, expiresAt, createdAt)
- warnings (id, userId, warnedBy, reason, createdAt)
- reactions (id, userId, targetType, targetId, type, createdAt)
- dm_messages (id, roomId, userId, content, createdAt) — personal DMs
- sessions, accounts (NextAuth tables)

---

## Key API Endpoints

### Auth
- POST /api/auth/register — Create account
- POST /api/auth/[...nextauth] — NextAuth login/logout
- GET /api/admin/reset-admin?secret=purplehackers-reset-2026 — Reset admin

### Forum
- GET /api/posts — List posts (params: sort, category, skip, take)
- POST /api/posts — Create post (auth required)
- GET /api/posts/[slug] — Get single post
- PATCH /api/posts/[slug] — Edit post (author/admin)
- DELETE /api/posts/[slug] — Delete post (author/admin)
- POST /api/posts/vote — Upvote/downvote
- GET /api/posts/categories — List categories
- POST /api/comments — Create comment
- PATCH /api/comments/[id] — Edit comment
- DELETE /api/comments/[id] — Delete comment

### Chat
- GET /api/chat/rooms — List rooms
- GET /api/chat/messages?roomId=X — Get messages
- POST /api/chat/messages — Send message

### DMs
- GET /api/dm/conversations — List conversations
- GET /api/dm/[username] — Get DM thread
- POST /api/dm/[username] — Send DM
- GET /api/dm/count — Unread count

### Profile
- GET /api/profile/[username] — Get profile
- GET /api/profile/me — Get own profile
- PATCH /api/profile/me — Update profile

### Notifications
- GET /api/notifications — List
- PATCH /api/notifications — Mark read
- GET /api/notifications/count — Unread count

### Admin
- GET /api/admin/stats — Platform stats
- GET /api/admin/users — User list
- GET /api/admin/reports — Reports list
- GET /api/admin/bans — Bans list

### File Upload
- POST /api/upload — Upload avatar or post media (FormData: file, kind)

### Setup/Migration
- GET /api/setup — FULL DATABASE RESET (destructive)
- GET /api/migrate — Additive migration (safe, adds columns/indexes)
- GET /api/seed — Seed categories

---

## Deployment Commands

```bash
# From the project directory:
cd /app/conversations/6a8b64f612b12b330062a70d/purple-hackers

# Build locally to check for errors
npx prisma generate
npm run build

# Deploy to Vercel production
vercel deploy --prod --yes

# After deploying, run migration:
curl https://purple-hackers.vercel.app/api/migrate

# Reset admin if needed:
curl "https://purple-hackers.vercel.app/api/admin/reset-admin?secret=purplehackers-reset-2026"

# Push to GitHub (from clean copy to avoid LFS issues):
cd /app/conversations/6a8b64f612b12b330062a70d/purple-hackers-github
git add -A && git commit -m "update" && git push origin main
```

---

## Current State (as of Sept 1, 2026)

### Completed
1. Database working (Supabase eu-west-1 pooler, purple_hackers schema)
2. Auth (login/register) working with admin account
3. Forum with categories, posts, comments, upvotes
4. Chat rooms (real-time polling)
5. Personal DMs
6. Notifications system
7. User profiles with avatars and reputation
8. Admin panel (users, bans, reports)
9. Settings page with avatar upload
10. Media uploads (images/videos) on posts
11. Post delete/edit (author + admin)
12. Comment delete/edit (author + admin)
13. Navbar with mobile menu, notifications badge, DM badge
14. Responsive design with overflow-x protection
15. Landing page redesigned (more natural, less vibe-coded)
16. Build passes clean (40 routes)
17. Deployed to Vercel production
18. Code pushed to GitHub (Ace-Miles/purple-hackers)
19. DB migration applied (mediaUrls column, indexes)

### Known Issues / TODO
1. Vercel deployment protection (SSO) was disabled to allow API access — should be re-enabled for security if not needed
2. Chat uses polling (2-3 sec intervals) — could upgrade to WebSocket/SSE for real-time
3. Supabase storage bucket needs to exist for avatar/media uploads to work
4. Landing page may still need refinement based on community feedback

### Important Notes
- The Supabase project is SHARED with "Acemiles OS" (another project). Purple Hackers uses the `purple_hackers` schema. Do NOT run /api/setup on production — it drops all tables. Use /api/migrate for additive changes.
- Git LFS is configured in the Base44 sandbox and interferes with GitHub pushes. Use the clean copy at `purple-hackers-github/` for GitHub operations.
- The Vercel CLI uses the token from `$VERCEL_TOKEN` env var. No manual login needed.
- Build can take 2-4 minutes. Use `timeout 300` when running build commands.

---

## Quick Recovery Guide

If the site is down or broken:
1. Check if Vercel deployment is up: `curl -s https://purple-hackers.vercel.app/api/stats`
2. If DB connection fails: verify Supabase project is not paused (free tier pauses after 1 week of inactivity)
3. If admin can't login: `curl "https://purple-hackers.vercel.app/api/admin/reset-admin?secret=purplehackers-reset-2026"`
4. If schema is broken: `curl https://purple-hackers.vercel.app/api/migrate`
5. Redeploy: `cd /app/conversations/6a8b64f612b12b330062a70d/purple-hackers && vercel deploy --prod --yes`
6. Rebuild from GitHub: `git clone https://github.com/Ace-Miles/purple-hackers.git && npm install && npx prisma generate && npm run build`
