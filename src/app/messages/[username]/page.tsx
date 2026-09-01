"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Send, Loader2, AlertCircle, ImagePlus, X, Copy, Trash2, Reply, BadgeCheck, Bot, MoreHorizontal, Check } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { MediaLightbox, useLightbox } from "@/components/MediaLightbox";
import { MentionText } from "@/components/MentionText";

export default function DmThread() {
  const { username } = useParams() as { username: string };
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState("");
  const [viewportHeight, setViewportHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 800);
  const [replyTo, setReplyTo] = useState<{ content: string } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitiallyScrolled = useRef(false);
  const router = useRouter();
  const { lightbox, openLightbox } = useLightbox();

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const updateHeight = () => setViewportHeight(window.visualViewport!.height);
    window.visualViewport.addEventListener("resize", updateHeight);
    return () => window.visualViewport?.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    fetch(`/api/dm/${username}`).then(async r => {
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Failed to load"); setLoading(false); return; }
      setMessages(d.messages || []);
      setOtherUser(d.otherUser);
      setLoading(false);
    }).catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch(`/api/dm/${username}`).then(r => r.json()).then(d => {
        if (d.messages) setMessages(d.messages);
      }).catch(() => {});
    }, 2500);
    return () => clearInterval(interval);
  }, [username, status, router]);

  useEffect(() => {
    if (!hasInitiallyScrolled.current && scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      hasInitiallyScrolled.current = true;
    }
  }, [messages]);

  useEffect(() => {
    const handler = () => setActionMenu(null);
    if (actionMenu) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [actionMenu]);

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "post");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) setPendingMedia({ url: d.url, type: d.type });
      else alert(d.error || "Upload failed");
    } catch {
      alert("Upload failed");
    }
    setUploading(false);
  };

  const handleCopy = (m: any) => {
    if (m.content) {
      navigator.clipboard.writeText(m.content).catch(() => {});
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
    setActionMenu(null);
  };

  const handleReply = (m: any) => {
    setReplyTo({ content: m.content || "📷 Media" });
    setActionMenu(null);
    inputRef.current?.focus();
  };

  const handleDeleteDM = async (m: any) => {
    setActionMenu(null);
    if (!confirm("Delete this message?")) return;
    // For DMs, we use the chat message delete endpoint
    await fetch(`/api/chat/messages/${m.id}`, { method: "DELETE" }).catch(() => {});
    setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, isDeleted: true, content: "[deleted]" } : msg));
  };

  const sendMessage = async () => {
    if (!newMsg.trim() && !pendingMedia) return;
    setSending(true);
    const content = newMsg;
    const mediaUrl = pendingMedia?.url || null;
    setNewMsg("");
    setPendingMedia(null);
    setReplyTo(null);
    try {
      const res = await fetch(`/api/dm/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mediaUrl }),
      });
      const d = await res.json();
      if (res.ok) setMessages(prev => [...prev, d.message]);
    } catch {}
    setSending(false);
  };

  if (status === "loading" || loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
      <p className="text-slate-400">{error}</p>
      <Link href="/messages" className="text-purple-400 text-sm mt-3 inline-block">Back to messages</Link>
    </div>
  );

  const myId = (session?.user as any)?.id;
  const myRole = (session?.user as any)?.role;
  const containerHeight = `calc(${viewportHeight}px - 3.5rem)`;
  const isPurpleAI = otherUser?.username === "PurpleAI";

  return (
    <div className="max-w-2xl mx-auto px-3 py-3 flex flex-col" style={{ height: containerHeight }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800 shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0"
          style={isPurpleAI ? { background: "linear-gradient(135deg, #a855f7, #6366f1)" } : {}}>
          {isPurpleAI ? (
            <Bot size={18} className="text-white" />
          ) : otherUser?.avatar ? (
            <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
          ) : otherUser?.username?.slice(0, 2).toUpperCase()}
        </div>
        <Link href={isPurpleAI ? "#" : `/u/${otherUser?.username}`} className="font-semibold text-white text-sm hover:text-purple-400 truncate"
          onClick={e => isPurpleAI && e.preventDefault()}>
          {otherUser?.username}
        </Link>
        {isPurpleAI && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium border border-purple-500/30">AI Assistant</span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-10">
            {isPurpleAI ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
                  <Bot size={32} className="text-white" />
                </div>
                <p className="text-purple-400 font-medium">Purple AI</p>
                <p className="text-xs mt-1 text-slate-500">Ask me anything about cybersecurity, the community, or ethical hacking!</p>
              </>
            ) : (
              <span>Say hello to {otherUser?.username} 👋</span>
            )}
          </div>
        )}
        {messages.map((m: any) => {
          const isMe = m.userId === myId || m.user?.id === myId;
          const isDeleted = m.isDeleted || m.content === "[deleted]";
          const canDelete = isMe || myRole === "ADMIN" || myRole === "MODERATOR" || myRole === "FOUNDER";
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
              <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"} relative`}>
                {m.mediaUrl && !isDeleted && (
                  <div className="rounded-2xl overflow-hidden border border-slate-700 max-w-[220px] mb-1 cursor-pointer" onClick={() => openLightbox(m.mediaUrl, m.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? "video" : "image")}>
                    {m.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={m.mediaUrl} className="w-full max-h-56 object-cover pointer-events-none" />
                    ) : (
                      <img src={m.mediaUrl} alt="" className="w-full max-h-56 object-cover pointer-events-none" />
                    )}
                  </div>
                )}
                {m.content && (
                  <div className={`px-3.5 py-2 rounded-2xl text-sm break-words ${isDeleted ? "italic text-slate-600" : isMe ? "bg-purple-600 text-white" : isPurpleAI && !isMe ? "bg-purple-500/15 text-purple-200 border border-purple-500/20" : "bg-slate-800 text-slate-200"}`}>
                    <MentionText text={m.content} />
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`text-[10px] ${isMe ? "text-purple-200/70" : "text-slate-500"}`}>{timeAgo(m.createdAt)}</div>
                  {!isDeleted && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === m.id ? null : m.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-500 hover:text-purple-400"
                      >
                        <MoreHorizontal size={12} />
                      </button>
                      {actionMenu === m.id && (
                        <div className="absolute z-50 top-full mt-1 right-0 bg-slate-900 border border-purple-500/20 rounded-lg shadow-xl py-1 min-w-[120px]" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleReply(m)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-purple-500/10 hover:text-purple-400">
                            <Reply size={12} /> Reply
                          </button>
                          {m.content && (
                            <button onClick={() => handleCopy(m)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-purple-500/10 hover:text-purple-400">
                              {copiedId === m.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} {copiedId === m.id ? "Copied!" : "Copy"}
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDeleteDM(m)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 bg-purple-500/10 border-l-2 border-purple-500 rounded-r-lg mb-1">
          <Reply size={12} className="text-purple-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-slate-500 hover:text-slate-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pending media preview */}
      {pendingMedia && (
        <div className="flex gap-2 py-2 shrink-0">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0">
            {pendingMedia.type.startsWith("video") ? (
              <video src={pendingMedia.url} className="w-full h-full object-cover" />
            ) : (
              <img src={pendingMedia.url} alt="" className="w-full h-full object-cover" />
            )}
            <button onClick={() => setPendingMedia(null)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5">
              <X size={12} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 bg-[#0b0b16]/95 backdrop-blur border-t border-purple-500/15 px-1 py-2 pb-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={e => handleFile(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}
            className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 transition-all shrink-0">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
          <input ref={inputRef} type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            className="input-dark flex-1" placeholder={isPurpleAI ? "Ask Purple AI anything..." : "Type a message..."} />
          <button onClick={sendMessage} disabled={sending || (!newMsg.trim() && !pendingMedia)} className="btn-purple px-4 shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>

      {lightbox && <MediaLightbox src={lightbox.src} type={lightbox.type} />}
    </div>
  );
}
