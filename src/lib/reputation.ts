import { prisma } from "@/lib/prisma";

// Reputation threshold for the purple verified checkmark
export const VERIFIED_REPUTATION_THRESHOLD = 999;

// Call this after any reputation increment to award the purple verified badge
// once a user crosses the threshold. Safe to call often — no-op if already verified
// or below threshold.
export async function checkAndAwardVerified(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reputation: true, verified: true, username: true },
    });
    if (!user || user.verified || user.reputation < VERIFIED_REPUTATION_THRESHOLD) return;

    await prisma.user.update({ where: { id: userId }, data: { verified: true } });
    await prisma.notification.create({
      data: {
        userId,
        type: "badge",
        title: "You earned the Purple Verified Badge! 💜✔️",
        content: "Your reputation hit 999 — you now have the purple checkmark on your profile.",
        link: `/u/${user.username}`,
      },
    }).catch(() => {});
  } catch {
    // Non-critical — never let a badge check break the main request
  }
}
