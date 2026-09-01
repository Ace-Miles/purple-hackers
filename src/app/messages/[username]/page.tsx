"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Send, Loader2, AlertCircle, ImagePlus, X } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { MediaLightbox, useLightbox } from "@/components/MediaLightbox";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitiallyScrolled = useRef(false);
  const router = useRouter();
  const { lightbox, openLightbox } = useLightbox();

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

  const sendMessage = async () => {
    if (!newMsg.trim() && !pendingMedia) return;
    setSending(true);
    const content = newMsg;
    const mediaUrl = pendingMedia?.url || null;
    setNewMsg("");
    setPendingMedia(null);
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

  return (
    <div className="max-w-2xl mx-auto px-3 py-3 flex flex-col" style={{ height: "calc(100dvh - 3.5rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800 shrink-0">
        <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
          {otherUser?.avatar ? <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" /> : otherUser?.username?.slice(0, 2).toUpperCase()}
        </div>
        <Link href={`/u/${otherUser?.username}`} className="font-semibold text-white text-sm hover:text-purple-400 truncate">{otherUser?.username}</Link>
      </div>

      {/* Messages — only this scrolls */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-10">Say hello to {otherUser?.username} 👋</div>
        )}
        {messages.map((m: any) => {
          const isMe = m.userId === myId || m.user?.id === myId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {m.mediaUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-700 max-w-[220px] mb-1 cursor-pointer" onClick={() => openLightbox(m.mediaUrl, m.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? "video" : "image")}>
                    {m.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={m.mediaUrl} className="w-full max-h-56 object-cover" />
                    ) : (
                      <img src={m.mediaUrl} alt="" className="w-full max-h-56 object-cover" />
                    )}
                  </div>
                )}
                {m.content && (
                  <div className={`px-3.5 py-2 rounded-2xl text-sm break-words ${isMe ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                    {m.content}
                  </div>
                )}
                <div className={`text-[10px] mt-1 ${isMe ? "text-purple-200/70" : "text-slate-500"}`}>{timeAgo(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Input — sticky at bottom, no overlap since bottom nav is hidden */}
      <div className="shrink-0 sticky bottom-0 bg-[#0b0b16]/95 backdrop-blur border-t border-purple-500/15 px-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={e => handleFile(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}
            className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 transition-all shrink-0">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
          <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            className="input-dark flex-1" placeholder="Type a message..." />
          <button onClick={sendMessage} disabled={sending || (!newMsg.trim() && !pendingMedia)} className="btn-purple px-4 shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
      {lightbox && <MediaLightbox src={lightbox.src} type={lightbox.type} />}
    </div>
  );
}
