"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2, Search } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function Messages() {
  const { status } = useSession();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/dm/conversations").then(r => r.json()).then(d => {
        setConversations(d.conversations || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [status, router]);

  const goToUser = () => {
    if (search.trim()) router.push(`/messages/${search.trim()}`);
  };

  if (status === "loading" || loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-purple-gradient mb-6 flex items-center gap-2"><MessageSquare size={22} /> Messages</h1>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && goToUser()}
          className="input-dark pl-10" placeholder="Message a user by username..." />
      </div>

      {conversations.length === 0 ? (
        <div className="card p-16 text-center">
          <MessageSquare size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 text-sm mb-1">No conversations yet</p>
          <p className="text-slate-500 text-xs">Search a username above to start chatting</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c: any) => (
            <Link key={c.roomId} href={`/messages/${c.otherUser.username}`}
              className={`card p-4 glass-hover transition-all flex items-center gap-3 ${c.unread ? "border-purple-500/30 bg-purple-500/5" : ""}`}>
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                {c.otherUser.avatar ? <img src={c.otherUser.avatar} alt="" className="w-full h-full object-cover" /> : c.otherUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white text-sm truncate">{c.otherUser.username}</span>
                  {c.lastMessage && <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(c.lastMessage.createdAt)}</span>}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage?.content || "No messages yet"}</p>
              </div>
              {c.unread && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
