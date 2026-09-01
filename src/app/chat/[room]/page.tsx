"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Send, Loader2, Hash, Users, ImagePlus, X, Shield, Crown, Copy, Trash2, Reply, BadgeCheck, Bot, MoreHorizontal, Check } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { MediaLightbox, useLightbox } from "@/components/MediaLightbox";
import { MentionText } from "@/components/MentionText";

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
  const [viewportHeight, setViewportHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 800);
  const [replyTo, setReplyTo] = useState<{ username: string; content: string } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { lightbox, openLightbox } = useLightbox();
  const lastScrollHeight = useRef(0);
  const isAtBottom = useRef(true);
  const hasInitiallyScrolled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const updateHeight = () => setViewportHeight(window.visualViewport!.height);
    window.visualViewport.addEventListener("resize", updateHeight);
    return () => window.visualViewport?.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    fetch(`/api/chat/messages?roomId=${roomId}`).then(r => r.json()).then(d => {
      setMessages(d.messages || []);
      setRoom(d.room);
      setLoading(false);
    }).catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch(`/api/chat/messages?roomId=${roomId}`).then(r => r.json()).then(d => {
        if (d.messages?.length) setMessages(d.messages);
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [roomId, status, router]);

  useEffect(() => {
    if (!hasInitiallyScrolled.current && scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      hasInitiallyScrolled.current = true;
    }
  }, [messages]);

  // Close action menu on outside click
  useEffect(() => {
    const handler = () => setActionMenu(null);
    if (actionMenu) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [actionMenu]);

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
        if (res.ok) setPendingMedia(prev => [...prev, { url: d.url, type: d.type }]);
      } catch {}
    }
    setUploading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMsg(val);
    // Show slash menu when "/" is typed at start or after space
    if (val === "/" || val.endsWith(" /")) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const insertPurpleAI = () => {
    setNewMsg(prev => {
      if (prev === "/") return "@PurpleAI ";
      if (prev.endsWith(" /")) return prev.slice(0, -1) + "@PurpleAI ";
      return "@PurpleAI ";
    });
    setShowSlashMenu(false);
    inputRef.current?.focus();
  };

  const handleReply = (msg: any) => {
    setReplyTo({ username: msg.user?.username, content: msg.content || "📷 Media" });
    setNewMsg(`@${msg.user?.username} `);
    setActionMenu(null);
    inputRef.current?.focus();
  };

  const handleCopy = (msg: any) => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content).catch(() => {});
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
    setActionMenu(null);
  };

  const handleDelete = async (msg: any) => {
    setActionMenu(null);
    if (!confirm("Delete this message?")) return;
    await fetch(`/api/chat/messages/${msg.id}`, { method: "DELETE" });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isDeleted: true, content: "[deleted]" } : m));
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && pendingMedia.length === 0) || !session) return;
    setSending(true);
    const content = newMsg.trim();
    const mediaUrls = pendingMedia.map(m => m.url);
    setNewMsg("");
    setPendingMedia([]);
    setReplyTo(null);

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
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch {}
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;
  if (!room) return <div className="text-center py-20 text-slate-400">Room not found</div>;

  const containerHeight = `calc(${viewportHeight}px - 3.5rem)`;
  const myId = (session?.user as any)?.id;
  const myRole = (session?.user as any)?.role;

  return (
    <div className="max-w-4xl mx-auto px-3 py-3 flex flex-col relative" style={{ height: containerHeight }}>
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

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Hash size={48} className="mx-auto mb-3 text-slate-700" />
            <p>No messages yet. Start the conversation!</p>
            <p className="text-xs mt-2 text-slate-600">Type <code className="text-purple-400">/</code> to mention Purple AI</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isOwn = msg.user?.username === (session?.user as any)?.username;
            const isAdmin = msg.user?.role === "ADMIN";
            const isFounder = msg.user?.isFounder === true;
            const isPurpleAI = msg.user?.username === "PurpleAI";
            const isDeleted = msg.isDeleted || msg.content === "[deleted]";
            const canDelete = isOwn || myRole === "ADMIN" || myRole === "MODERATOR" || myRole === "FOUNDER";
            return (
              <div key={msg.id} className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}>
                <Link href={isPurpleAI ? "#" : `/u/${msg.user?.username}`} className="shrink-0" onClick={e => isPurpleAI && e.preventDefault()}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0"
                    style={isPurpleAI ? { background: "linear-gradient(135deg, #a855f7, #6366f1)" } : {}}>
                    {isPurpleAI ? (
                      <Bot size={16} className="text-white" />
                    ) : msg.user?.avatar ? (
                      <img src={msg.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      msg.user?.username?.slice(0, 2).toUpperCase()
                    )}
                  </div>
                </Link>
                <div className={`max-w-[75%] ${isOwn ? "items-end" : ""} flex flex-col relative`}>
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={`text-xs font-medium ${isPurpleAI ? "text-purple-400" : "text-purple-400"}`}>{msg.user?.username}</span>
                    {isPurpleAI && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium border border-purple-500/30">AI</span>
                    )}
                    {isAdmin && !isFounder && (
                      <span className="role-badge role-badge-admin" title="Admin"><Shield size={10} /></span>
                    )}
                    {isFounder && (
                      <span className="role-badge role-badge-founder" title="Founder"><Crown size={10} /></span>
                    )}
                    {msg.user?.verified && !isFounder && <BadgeCheck size={12} className="text-purple-400" />}
                    <span className="text-[10px] text-slate-600">{timeAgo(msg.createdAt)}</span>
                  </div>
                  {msg.content && (
                    <div className={`px-3 py-2 rounded-lg text-sm break-words ${isDeleted ? "italic text-slate-600" : isOwn ? "bg-purple-600 text-white" : isPurpleAI ? "bg-purple-500/15 text-purple-200 border border-purple-500/20" : "bg-slate-800 text-slate-200"}`}>
                      <MentionText text={msg.content} />
                    </div>
                  )}
                  {msg.mediaUrl && !isDeleted && (
                    <div className="mt-1 rounded-lg overflow-hidden border border-slate-700 max-w-[240px] cursor-pointer" onClick={() => openLightbox(msg.mediaUrl, msg.mediaUrl.match(/\.(mp4|webm|mov)$/i) || (msg.type === "media" && msg.mediaUrl?.includes("video")) ? "video" : "image")}>
                      {msg.mediaUrl.match(/\.(mp4|webm|mov)$/i) || msg.type === "media" && msg.mediaUrl?.includes("video") ? (
                        <video src={msg.mediaUrl} className="w-full max-h-48 object-cover pointer-events-none" />
                      ) : (
                        <img src={msg.mediaUrl} alt="" className="w-full max-h-48 object-cover pointer-events-none" />
                      )}
                    </div>
                  )}
                  {/* Action menu button — appears on hover/tap */}
                  {!isDeleted && (
                    <div className="relative mt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === msg.id ? null : msg.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:text-purple-400"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {actionMenu === msg.id && (
                        <div className="absolute z-50 bottom-full mb-1 bg-slate-900 border border-purple-500/20 rounded-lg shadow-xl py-1 min-w-[120px]" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleReply(msg)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-purple-500/10 hover:text-purple-400">
                            <Reply size={12} /> Reply
                          </button>
                          {msg.content && (
                            <button onClick={() => handleCopy(msg)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-purple-500/10 hover:text-purple-400">
                              {copiedId === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} {copiedId === msg.id ? "Copied!" : "Copy"}
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(msg)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 bg-purple-500/10 border-l-2 border-purple-500 rounded-r-lg mb-1">
          <Reply size={12} className="text-purple-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-purple-400 font-medium">Replying to {replyTo.username}</span>
            <p className="text-xs text-slate-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => { setReplyTo(null); setNewMsg(""); }} className="p-1 text-slate-500 hover:text-slate-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Slash menu popup */}
      {showSlashMenu && (
        <div className="shrink-0 mb-1 bg-slate-900/95 border border-purple-500/20 rounded-lg p-2 backdrop-blur">
          <button onClick={insertPurpleAI} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-purple-500/10 transition-all">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
              <Bot size={14} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm text-purple-400 font-medium">@PurpleAI</p>
              <p className="text-[10px] text-slate-500">Ask the AI a question</p>
            </div>
          </button>
        </div>
      )}

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

      {/* Input bar */}
      <div className="shrink-0 bg-[#0b0b16]/95 backdrop-blur border-t border-purple-500/15 px-1 py-2 pb-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden
            onChange={e => handleFiles(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}
            className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 transition-all shrink-0">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMsg}
            onChange={handleInputChange}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setShowSlashMenu(false); sendMessage(); } }}
            className="input-dark flex-1 min-w-0"
            placeholder="Type a message... (use / for Purple AI)"
            disabled={sending}
          />
          <button onClick={() => { setShowSlashMenu(false); sendMessage(); }} disabled={sending || (!newMsg.trim() && pendingMedia.length === 0)}
            className="btn-purple flex items-center justify-center px-4 shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>

      {lightbox && <MediaLightbox src={lightbox.src} type={lightbox.type} />}
    </div>
  );
}
