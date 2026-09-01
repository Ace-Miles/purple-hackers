"use client";
import Link from "next/link";

// Renders text with @username mentions highlighted as clickable purple links
export function MentionText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]{2,32})/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
          const username = part.slice(1);
          return (
            <Link key={i} href={`/u/${username}`} className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
