import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const myId = (session.user as any).id;
  
  // Get my referral code and count
  const me = await prisma.user.findUnique({
    where: { id: myId },
    select: { referralCode: true, referralCount: true, referredBy: true, badges: true },
  });
  
  // Get people I've referred
  const referrals = await prisma.referral.findMany({
    where: { referrerId: myId },
    include: { referred: { select: { id: true, username: true, avatar: true, joinedAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  
  // Check badges
  const hasPurpleOG = (me?.badges || []).some(b => b.includes("Purple O.G") || b.includes("Purple OG"));
  const hasPurpleBadge = (me?.badges || []).some(b => b.includes("Purple Badge") || b.includes("💜🏅"));
  
  // Who referred me
  let referrer = null;
  if (me?.referredBy) {
    referrer = await prisma.user.findUnique({
      where: { id: me.referredBy },
      select: { username: true, avatar: true },
    });
  }
  
  return NextResponse.json({
    referralCode: me?.referralCode || "",
    referralCount: me?.referralCount || 0,
    referrals,
    hasPurpleOG,
    hasPurpleBadge,
    referrer,
  });
}
