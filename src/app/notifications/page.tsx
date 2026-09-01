"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, MessageSquare, Heart, AtSign, CheckCheck } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const ICONS: Record<string, any> = { reply: MessageSquare, dm: MessageSquare, mention: AtSign, reaction: Heart };

export default function Notifications() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = () => {
    fetch("/api/notifications").then(r => r.json()).then(d => {
      setNotifications(d.notifications || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") load();
  }, [status, router]);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markOneRead = async (id: string, link?: string | null) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (link) router.push(link);
  };

  if (status === "loading" || loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-purple-gradient flex items-center gap-2"><Bell size={22} /> Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <button onClick={markAllRead} className="btn-ghost flex items-center gap-2 text-xs"><CheckCheck size={14} /> Mark all read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button key={n.id} onClick={() => markOneRead(n.id, n.link)}
                className={`w-full text-left card p-4 glass-hover transition-all flex items-start gap-3 ${!n.isRead ? "border-purple-500/30 bg-purple-500/5" : ""}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${!n.isRead ? "bg-purple-500/20" : "bg-slate-800"}`}>
                  <Icon size={16} className={!n.isRead ? "text-purple-400" : "text-slate-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium break-words">{n.title}</div>
                  {n.content && <div className="text-xs text-slate-500 mt-0.5 break-words line-clamp-2">{n.content}</div>}
                  <div className="text-[11px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
