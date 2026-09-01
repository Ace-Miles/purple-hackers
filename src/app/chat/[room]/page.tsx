"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Send, Loader2, Hash, Users, ImagePlus, X, Shield, Crown } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function ChatRoom() {
  const { room: roomId } = useParams() as { room: string };
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const lastScrollHeight = useRef(0);
  const isAtBottom = useRef(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    fetch(`/api/chat/messages?roomId=${roomId}`).then(r => r.json()).then(d => {
      setMessages(d.messages || []);
      setRoom(d.room);
      setLoading(false);
    }).catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch(`/api/chat/messages?roomId=${roomId}`)
        .then(r => r.json())
        .then(d => {
          if (d.messages?.length) {
            setMessages(d.messages);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [roomId, status, router]);

  // Only scroll to bottom on initial load - NO auto-scroll on polls
  const hasInitiallyScrolled = useRef(false);
  useEffect(() => {
    if (!hasInitiallyScrolled.current && scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      hasInitiallyScrolled.current = true;
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, 4 - pendingMedia.length)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "post");
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (res.ok) {
          setPendingMedia(prev => [...prev, { url: d.url, type: d.type }]);
        }
      } catch {}
    }
    setUploading(false);
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && pendingMedia.length === 0) || !session) return;
    setSending(true);
    const content = newMsg.trim();
    const mediaUrls = pendingMedia.map(m => m.url);
    setNewMsg("");
    setPendingMedia([]);

    // Optimistic add
    const tempId = "temp-" + Date.now();
    setMessages(prev => [...prev, {
      id: tempId,
      content,
      mediaUrl: mediaUrls[0] || null,
      type: mediaUrls.length > 0 ? "media" : "text",
      user: { username: (session.user as any).username, avatar: (session.user as any).avatar, role: (session.user as any).role },
      createdAt: new Date().toISOString(),
      pending: true,
    }]);

    try {
      for (const url of mediaUrls) {
        await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "", roomId, mediaUrl: url, type: "media" }),
        });
      }
      if (content) {
        await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, roomId }),
        });
      }
      // Remove temp message - will be replaced by poll
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch {}
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;
  if (!room) return <div className="text-center py-20 text-slate-400">Room not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-3 py-3 flex flex-col" style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-bottom))" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <Hash size={20} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white truncate text-sm">{room.name}</h2>
          <p className="text-xs text-slate-500 truncate">{room.description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
          <Users size={14} /> {room.memberCount}
        </div>
      </div>

      {/* Messages — only this scrolls */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Hash size={48} className="mx-auto mb-3 text-slate-700" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isOwn = msg.user?.username === (session?.user as any)?.username;
            const isAdmin = msg.user?.role === "ADMIN";
            const isFounder = msg.user?.isFounder === true;
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                <Link href={`/u/${msg.user?.username}`} className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                    {msg.user?.avatar ? (
                      <img src={msg.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      msg.user?.username?.slice(0, 2).toUpperCase()
                    )}
                  </div>
                </Link>
                <div className={`max-w-[75%] ${isOwn ? "items-end" : ""} flex flex-col`}>
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-xs font-medium text-purple-400">{msg.user?.username}</span>
                    {isAdmin && (
                      <span className="role-badge role-badge-admin" title="Admin">
                        <Shield size={10} />
                      </span>
                    )}
                    {isFounder && (
                      <span className="role-badge role-badge-founder" title="Founder">
                        <Crown size={10} />
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600">{timeAgo(msg.createdAt)}</span>
                  </div>
                  {msg.content && (
                    <div className={`px-3 py-2 rounded-lg text-sm break-words ${isOwn ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                      {msg.content}
                    </div>
                  )}
                  {msg.mediaUrl && (
                    <div className="mt-1 rounded-lg overflow-hidden border border-slate-700 max-w-[240px]">
                      {msg.mediaUrl.match(/\.(mp4|webm|mov)$/i) || msg.type === "media" && msg.mediaUrl?.includes("video") ? (
                        <video src={msg.mediaUrl} controls className="w-full max-h-48 object-cover" />
                      ) : (
                        <img src={msg.mediaUrl} alt="" className="w-full max-h-48 object-cover" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending media previews */}
      {pendingMedia.length > 0 && (
        <div className="flex gap-2 py-2 shrink-0">
          {pendingMedia.map((m, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0">
              {m.type.startsWith("video") ? (
                <video src={m.url} className="w-full h-full object-cover" />
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
              <button onClick={() => setPendingMedia(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5">
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input — sticky bar, doesn't cause page scroll */}
      <div className="chat-input-bar shrink-0">
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden
            onChange={e => handleFiles(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}
            className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 transition-all shrink-0">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
          <input
            type="text"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="input-dark flex-1 min-w-0"
            placeholder="Type a message..."
            disabled={sending}
          />
          <button onClick={sendMessage} disabled={sending || (!newMsg.trim() && pendingMedia.length === 0)}
            className="btn-purple flex items-center justify-center px-4 shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
