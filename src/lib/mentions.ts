import { prisma } from "@/lib/prisma";

const MENTION_REGEX = /@([a-zA-Z0-9_]{2,32})/g;

export function extractMentionedUsernames(content: string): string[] {
  const matches = [...content.matchAll(MENTION_REGEX)].map(m => m[1]);
  return [...new Set(matches)];
}

// Detects @username mentions in content and creates "mention" notifications
// for each mentioned user (excluding the actor and anyone in excludeUserIds).
export async function processMentions({
  content,
  actorId,
  actorUsername,
  excludeUserIds = [],
  notifTitle,
  link,
}: {
  content: string;
  actorId: string;
  actorUsername: string;
  excludeUserIds?: string[];
  notifTitle: string;
  link: string;
}) {
  const usernames = extractMentionedUsernames(content);
  if (usernames.length === 0) return;

  try {
    const users = await prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true, username: true },
    });
    const toNotify = users.filter(u => u.id !== actorId && !excludeUserIds.includes(u.id));
    if (toNotify.length === 0) return;

    await prisma.notification.createMany({
      data: toNotify.map(u => ({
        userId: u.id,
        type: "mention",
        title: notifTitle,
        content: `@${actorUsername} mentioned you: "${content.slice(0, 100)}"`,
        link,
      })),
    });
  } catch {
    // Non-critical
  }
}
