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
    
    // Generate a password reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(12).toString('hex').toUpperCase();
    
    const user = await prisma.user.create({
      data: {
        username, email, password: hashed,
        referralCode: newReferralCode,
        referredBy: referrerId,
        passwordResetToken: resetToken,
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
          select: { referralCount: true, badges: true, reputation: true, username: true },
        });
        
        if (referrer) {
          const newCount = referrer.referralCount + 1;
          let newBadges = [...referrer.badges];
          
          // Award Purple O.G badge at 5 referrals
          if (newCount >= 5 && !newBadges.some(b => b.includes("Purple O.G") || b.includes("Purple OG"))) {
            newBadges.push("💜 Purple O.G");
            // Notify about the milestone
            await prisma.notification.create({
              data: {
                userId: referrerId,
                type: "badge",
                title: "You earned the Purple O.G Badge! 💜",
                content: "You've referred 5 members! You now have the Purple O.G Badge on your profile.",
                link: `/u/${referrer.username}`,
              },
            }).catch(() => {});
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

    // Send welcome DM from PurpleAI user (now lives in DMs, not chat rooms)
    try {
      // Find the PurpleAI user
      const aiUser = await prisma.user.findUnique({ where: { username: "PurpleAI" } });
      
      if (aiUser) {
        // Create a proper DM room between the new user and PurpleAI
        const dmId = `dm_${[user.id, aiUser.id].sort().join("_")}`;
        const dmRoom = await prisma.chatRoom.upsert({
          where: { id: dmId },
          update: {},
          create: {
            id: dmId,
            name: "DM",
            type: "DM",
            memberCount: 2,
            members: {
              create: [
                { userId: user.id },
                { userId: aiUser.id },
              ],
            },
          },
        });

        // Send welcome message from PurpleAI
        await prisma.chatMessage.create({
          data: {
            content: `💜 Welcome to Purple Hackers, @${username}!

Here's what you need to know:

1. Read the community rules at /rules
2. Pick your role tag in Settings (Frontend, Backend, Cybersec, etc.)
3. Check out the Resource Library for free tools and courses
4. Visit the Job Board for tech opportunities
5. Share what you're building in Project Showcase
6. Connect your Acemiles OS API key in Tools to unlock 90+ cybersecurity tools

If you have any questions, just reply here and I'll help you out! 🤖

— Purple AI`,
            roomId: dmRoom.id,
            userId: aiUser.id,
            type: "text",
          },
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Welcome DM failed:", e);
    }

    return NextResponse.json({ id: user.id, username: user.username, resetToken }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
