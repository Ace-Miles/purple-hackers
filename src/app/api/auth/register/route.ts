import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, email, password, referralCode } = await req.json();
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Email or username already taken" }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 12);
    
    // Generate unique referral code for new user
    const newReferralCode = `PH-${username.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    // Check referral code
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true, username: true, referralCount: true, badges: true },
      });
      if (referrer) {
        referrerId = referrer.id;
      }
    }
    
    const user = await prisma.user.create({
      data: {
        username, email, password: hashed,
        referralCode: newReferralCode,
        referredBy: referrerId,
      },
    });

    // Handle referral
    if (referrerId) {
      try {
        // Create referral record
        await prisma.referral.create({
          data: { referrerId, referredId: user.id },
        });
        
        // Increment referrer's count
        const referrer = await prisma.user.findUnique({
          where: { id: referrerId },
          select: { referralCount: true, badges: true, reputation: true },
        });
        
        if (referrer) {
          const newCount = referrer.referralCount + 1;
          let newBadges = [...referrer.badges];
          
          // Award Purple O.G badge at 2 referrals
          if (newCount >= 2 && !newBadges.some(b => b.includes("Purple O.G") || b.includes("Purple OG"))) {
            newBadges.push("💜 Purple O.G");
          }
          
          // Award reputation for referral
          const repGain = 10;
          
          await prisma.user.update({
            where: { id: referrerId },
            data: {
              referralCount: newCount,
              badges: newBadges,
              reputation: { increment: repGain },
            },
          });
          
          // Notify referrer
          await prisma.notification.create({
            data: {
              userId: referrerId,
              type: "REFERRAL",
              title: "New referral!",
              content: `@${username} joined using your referral code. You've referred ${newCount} member${newCount > 1 ? "s" : ""}!`,
              link: `/u/${username}`,
            },
          }).catch(() => {});
        }
      } catch (e) {
        // Referral is best-effort
      }
    }

    // Auto-follow founder on registration
    if (username.toLowerCase() !== "acemiles" && username.toLowerCase() !== "acemilex") {
      try {
        const founder = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: "Acemiles", mode: "insensitive" } },
              { email: "jameskamiles@gmail.com" },
            ],
          },
          select: { id: true, username: true },
        });

        if (founder) {
          await prisma.user.update({
            where: { id: founder.id },
            data: { role: "FOUNDER", isFounder: true, verified: true },
          }).catch(() => {});
        }

        if (founder && founder.id !== user.id) {
          await prisma.follow.create({
            data: { followerId: user.id, followingId: founder.id },
          }).catch(() => {});

          await prisma.user.update({
            where: { id: user.id },
            data: { followingCount: { increment: 1 } },
          });
          await prisma.user.update({
            where: { id: founder.id },
            data: { followersCount: { increment: 1 } },
          });
        }
      } catch (e) {
        console.error("Auto-follow failed:", e);
      }
    }

    // Send welcome DM from Purple AI bot
    try {
      // Find or create a DM room between the user and the Purple AI system
      const welcomeRoom = await prisma.chatRoom.findFirst({
        where: { name: "Welcome - Purple AI", type: "DM" },
      });
      
      let roomId = welcomeRoom?.id;
      if (!roomId) {
        const newRoom = await prisma.chatRoom.create({
          data: { name: "Welcome - Purple AI", type: "DM", description: "Welcome messages and bot chat" },
        });
        roomId = newRoom.id;
      }
      
      // Add user to the room
      await prisma.chatRoomUser.create({
        data: { roomId, userId: user.id },
      }).catch(() => {});
      
      // Send welcome message
      await prisma.chatMessage.create({
        data: {
          content: `💜 Welcome to Purple Hackers, @${username}!

Here's what you need to know:

1. Read the community rules at /rules
2. Pick your role tag in Settings (Frontend, Backend, Cybersec, etc.)
3. Check out the Resource Library for free tools and courses
4. Visit the Job Board for tech opportunities
5. Share what you're building in Project Showcase

If you have any questions, just reply here and I'll help you out! 🤖

— Purple AI`,
          roomId,
          userId: user.id,
          type: "bot",
        },
      }).catch(() => {});
    } catch (e) {
      console.error("Welcome DM failed:", e);
    }

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
