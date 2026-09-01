"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUp, ArrowDown, MessageSquare, Eye, Pin, Lock, Loader2, Send, AlertCircle, Edit, Trash2, Save, X, Flag, BadgeCheck, Heart, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MediaLightbox, useLightbox } from "@/components/MediaLightbox";
import { MentionText } from "@/components/MentionText";
import { timeAgo } from "@/lib/utils";

export default function PostDetail() {
  const { category, post: postSlug } = useParams() as { category: string; post: string };
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const router = useRouter();
  const { lightbox, openLightbox, closeLightbox } = useLightbox();
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; type: string } | null>(null);

  const fetchData = () => {
    fetch(`/api/posts/${postSlug}`).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [postSlug]);

  const submitReport = async () => {
    if (!reportTarget || !reportReason) return;
    setReporting(true);
    try {
      await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: reportTarget.id, targetType: reportTarget.type, reason: reportReason, description: reportDesc }),
      });
      setShowReport(false); setReportReason(""); setReportDesc(""); setReportTarget(null);
      alert("Report submitted. Our moderators will review it.");
    } catch { alert("Failed to submit report"); }
    setReporting(false);
  };

  const openReport = (id: string, type: string) => {
    if (!session) { router.push("/login"); return; }
    setReportTarget({ id, type });
    setShowReport(true);
  };

  const submitComment = async (parentId?: string) => {
    if (!session) { router.push("/login"); return; }
    setPosting(true);
    setError("");
    const content = parentId ? replyContent : comment;
    if (!content.trim()) { setPosting(false); return; }
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, postId: data.post.id, parentId }),
      });
      setComment("");
      setReplyContent("");
      setReplyTo(null);
      fetchData();
    } catch {
      setError("Failed to post comment");
    }
    setPosting(false);
  };

  const vote = async (postId: string, type: "up" | "down") => {
    if (!session) { router.push("/login"); return; }
    await fetch("/api/posts/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, type }),
    });
    fetchData();
  };

  const deletePost = async () => {
    if (!confirm("Delete this post? This can't be undone.")) return;
    const res = await fetch(`/api/posts/${postSlug}`, { method: "DELETE" });
    if (res.ok) router.push("/forum");
    else setError("Failed to delete post");
  };

  const startEdit = () => {
    setEditTitle(data.post.title);
    setEditContent(data.post.content);
    setEditing(true);
  };

  const saveEdit = async () => {
    const res = await fetch(`/api/posts/${postSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    if (res.ok) { setEditing(false); fetchData(); }
    else setError("Failed to save edit");
  };

  const voteComment = async (commentId: string, type: "up" | "down") => {
    if (!session) { router.push("/login"); return; }
    await fetch("/api/comments/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, type }),
    });
    fetchData();
  };

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const saveCommentEdit = async (id: string) => {
    const res = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editCommentText }),
    });
    if (res.ok) { setEditingComment(null); fetchData(); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;
  if (!data?.post) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-slate-400">Post not found</p>
      <Link href="/forum" className="text-purple-400 text-sm mt-2 inline-block">Back to forum</Link>
    </div>
  );

  const post = data.post;
  const myId = (session?.user as any)?.id;
  const myRole = (session?.user as any)?.role;
  const isAuthor = myId === post.authorId;
  const isAdmin = myRole === "ADMIN" || myRole === "MODERATOR" || myRole === "FOUNDER";
  const canModify = isAuthor || isAdmin;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 flex-wrap">
        <Link href="/forum" className="hover:text-purple-400">Forum</Link>
        <span>/</span>
        <Link href={`/forum/${post.category.slug}`} className="hover:text-purple-400 truncate">{post.category.name}</Link>
      </div>

      {/* Post */}
      <article className="card p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {post.isPinned && <span className="flex items-center gap-1 text-xs text-yellow-500"><Pin size={12} /> Pinned</span>}
          {post.isLocked && <span className="flex items-center gap-1 text-xs text-red-400"><Lock size={12} /> Locked</span>}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">{post.category.name}</span>
        </div>

        {editing ? (
          <div className="space-y-3 mb-4">
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-dark font-bold text-lg" maxLength={200} />
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="input-dark min-h-[160px] resize-y font-mono text-sm" />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="btn-purple flex items-center gap-2 text-xs"><Save size={14} /> Save</button>
              <button onClick={() => setEditing(false)} className="btn-ghost flex items-center gap-2 text-xs"><X size={14} /> Cancel</button>
            </div>
          </div>
        ) : (
          <h1 className="text-xl md:text-2xl font-bold text-white mb-3 break-words">{post.title}</h1>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-800 flex-wrap">
          <Link href={`/u/${post.author.username}`} className="flex items-center gap-2 hover:text-purple-400 min-w-0">
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden">
              {post.author.avatar ? <img src={post.author.avatar} alt="" className="w-full h-full object-cover" /> : post.author.username.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-medium text-purple-400 truncate">{post.author.username}</span>
            {post.author.isFounder && <span className="badge bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[9px]">👑 FOUNDER</span>}
            {!post.author.isFounder && post.author.role === "ADMIN" && <span className="badge badge-admin text-[9px]">ADMIN</span>}
            {post.author.role === "MODERATOR" && <span className="badge badge-mod text-[9px]">MOD</span>}
            {post.author.verified && <BadgeCheck size={12} className="text-purple-400" />}
          </Link>
          <span>{timeAgo(post.createdAt)}</span>
          {post.editedAt && <span className="italic">(edited)</span>}
          <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
        </div>

        {!editing && (
          <div className="prose prose-invert prose-base max-w-none break-words text-[17px] leading-[1.7]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              code({ node, className, children, ...props }: any) {
                const isInline = !className?.includes("language-");
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 text-[14px] break-words" {...props}>{children}</code>
                ) : (
                  <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto">
                    <code className="text-[14px] text-slate-300" {...props}>{children}</code>
                  </pre>
                );
              }
            }}>{post.content}</ReactMarkdown>
          </div>
        )}

        {/* Media */}
        {!editing && post.mediaUrls?.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {post.mediaUrls.map((url: string, i: number) => (
              url.match(/\.(mp4|webm|mov)$/i) ? (
                <div key={i} className="relative rounded-lg overflow-hidden bg-black cursor-pointer group" onClick={() => openLightbox(url, "video")}>
                  <video src={url} controls className="rounded-lg w-full max-h-80 object-contain" />
                </div>
              ) : (
                <div key={i} className="rounded-lg overflow-hidden bg-black cursor-pointer" onClick={() => openLightbox(url, "image")}>
                  <img key={i} src={url} alt="" className="rounded-lg w-full max-h-80 object-contain" />
                </div>
              )
            ))}
          </div>
        )}

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">#{tag}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800 flex-wrap">
          <button onClick={() => vote(post.id, "up")} className="flex items-center gap-1.5 group">
            <Heart size={18} className={`like-btn ${post.myReaction === "up" ? "liked" : "text-slate-400 group-hover:text-purple-300"}`} fill={post.myReaction === "up" ? "currentColor" : "none"} />
            <span className={`text-sm font-medium ${post.myReaction === "up" ? "text-purple-300" : "text-slate-500"}`}>{post.upvotes}</span>
          </button>
          <button onClick={() => vote(post.id, "down")} className="flex items-center gap-1.5 group">
            <ThumbsDown size={16} className={`dislike-btn ${post.myReaction === "down" ? "disliked" : "text-slate-400 group-hover:text-rose-300"}`} fill={post.myReaction === "down" ? "currentColor" : "none"} />
            <span className={`text-sm font-medium ${post.myReaction === "down" ? "text-rose-400" : "text-slate-500"}`}>{post.downvotes}</span>
          </button>
          <span className="flex items-center gap-1 text-sm text-slate-400"><MessageSquare size={16} /> {(data.comments || []).length}</span>
          {canModify && !editing && (
            <div className="flex items-center gap-3 ml-auto">
              {isAuthor && (
                <button onClick={startEdit} className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400 transition-all"><Edit size={14} /> Edit</button>
              )}
              <button onClick={deletePost} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-all"><Trash2 size={14} /> Delete</button>
            </div>
          )}
          {!isAuthor && session && (
            <button onClick={() => openReport(post.id, "POST")} className="flex items-center gap-1 text-xs text-slate-500 hover:text-yellow-400 transition-all ml-auto">
              <Flag size={14} /> Report
            </button>
          )}
        </div>
      </article>

      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4 break-words"><AlertCircle size={16} className="shrink-0" /> {error}</div>}

      {/* Comments */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white mb-3">Comments ({(data.comments || []).length})</h2>

        {/* New comment */}
        {session && !post.isLocked && (
          <div className="card p-4 mb-4">
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              className="input-dark min-h-[80px] resize-y text-sm" placeholder="Write a comment..." />
            <div className="flex justify-end mt-2">
              <button onClick={() => submitComment()} disabled={posting || !comment.trim()} className="btn-purple flex items-center gap-2 text-xs">
                <Send size={14} /> Comment
              </button>
            </div>
          </div>
        )}

        {(data.comments || []).map((c: any) => {
          const isCommentAuthor = myId === c.authorId;
          const canModComment = isCommentAuthor || isAdmin;
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Link href={`/u/${c.author.username}`} className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                    {c.author.avatar ? <img src={c.author.avatar} alt="" className="w-full h-full object-cover" /> : c.author.username.slice(0, 2).toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link href={`/u/${c.author.username}`} className="text-sm font-medium text-purple-400 hover:text-purple-300">{c.author.username}</Link>
                    {c.author.isFounder && <span className="badge bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[9px]">👑 FOUNDER</span>}
                    {!c.author.isFounder && c.author.role === "ADMIN" && <span className="badge badge-admin text-[9px]">ADMIN</span>}
                    {c.author.role === "MODERATOR" && <span className="badge badge-mod text-[9px]">MOD</span>}
                    <span className="text-xs text-slate-500">{timeAgo(c.createdAt)}</span>
                    {c.editedAt && <span className="text-xs text-slate-600 italic">(edited)</span>}
                  </div>

                  {editingComment === c.id ? (
                    <div className="space-y-2">
                      <textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)} className="input-dark min-h-[60px] resize-y text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => saveCommentEdit(c.id)} className="btn-purple text-xs px-3 py-1">Save</button>
                        <button onClick={() => setEditingComment(null)} className="btn-ghost text-xs px-3 py-1">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[15px] text-slate-300 prose prose-invert prose-sm max-w-none break-words leading-[1.65]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.content}</ReactMarkdown>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <button onClick={() => voteComment(c.id, "up")} className="flex items-center gap-1 group">
                      <Heart size={14} className={`like-btn ${c.myReaction === "up" ? "liked" : "text-slate-500 group-hover:text-purple-300"}`} fill={c.myReaction === "up" ? "currentColor" : "none"} />
                      <span className={`text-xs ${c.myReaction === "up" ? "text-purple-300" : "text-slate-500"}`}>{c.upvotes || 0}</span>
                    </button>
                    <button onClick={() => voteComment(c.id, "down")} className="flex items-center gap-1 group">
                      <ThumbsDown size={13} className={`dislike-btn ${c.myReaction === "down" ? "disliked" : "text-slate-500 group-hover:text-rose-300"}`} fill={c.myReaction === "down" ? "currentColor" : "none"} />
                      <span className={`text-xs ${c.myReaction === "down" ? "text-rose-400" : "text-slate-500"}`}>{c.downvotes || 0}</span>
                    </button>
                    {session && (
                      <button onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyContent(replyTo === c.id ? "" : `@${c.author.username} `); }} className="text-xs text-slate-500 hover:text-purple-400">Reply</button>
                    )}
                    {session && myId !== c.authorId && (
                      <button onClick={() => openReport(c.id, "COMMENT")} className="text-xs text-slate-500 hover:text-yellow-400">Report</button>
                    )}
                    {isCommentAuthor && editingComment !== c.id && (
                      <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.content); }} className="text-xs text-slate-500 hover:text-purple-400">Edit</button>
                    )}
                    {canModComment && (
                      <button onClick={() => deleteComment(c.id)} className="text-xs text-slate-500 hover:text-red-400">Delete</button>
                    )}
                  </div>

                  {/* Reply form */}
                  {replyTo === c.id && (
                    <div className="mt-2">
                      <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
                        className="input-dark min-h-[60px] resize-y text-sm" placeholder="Reply..." />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => submitComment(c.id)} disabled={posting || !replyContent.trim()} className="btn-purple text-xs px-3 py-1">Reply</button>
                        <button onClick={() => setReplyTo(null)} className="btn-ghost text-xs px-3 py-1">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Nested replies */}
                  {c.replies?.length > 0 && (
                    <div className="mt-3 space-y-3 pl-4 border-l border-slate-800">
                      {c.replies.map((r: any) => {
                        const isReplyAuthor = myId === r.authorId;
                        const canModReply = isReplyAuthor || isAdmin;
                        return (
                          <div key={r.id} className="flex items-start gap-2">
                            <Link href={`/u/${r.author.username}`} className="shrink-0">
                              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                                {r.author.avatar ? <img src={r.author.avatar} alt="" className="w-full h-full object-cover" /> : r.author.username.slice(0, 2).toUpperCase()}
                              </div>
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link href={`/u/${r.author.username}`} className="text-xs font-medium text-purple-400">{r.author.username}</Link>
                                <span className="text-[10px] text-slate-500">{timeAgo(r.createdAt)}</span>
                              </div>
                              <div className="text-xs text-slate-300 break-words">{r.content}</div>
                              {canModReply && (
                                <button onClick={() => deleteComment(r.id)} className="text-[10px] text-slate-500 hover:text-red-400 mt-1">Delete</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Lightbox */}
      {lightbox && <MediaLightbox src={lightbox.src} type={lightbox.type} />}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setShowReport(false)}>
          <div className="card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Report {reportTarget?.type === "POST" ? "Post" : "Comment"}</h3>
            <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="input-dark mb-3">
              <option value="">Select reason...</option>
              <option value="SPAM">Spam</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="ILLEGAL_CONTENT">Illegal Content</option>
              <option value="MALWARE">Malware</option>
              <option value="NSFW">NSFW</option>
              <option value="OFF_TOPIC">Off Topic</option>
              <option value="OTHER">Other</option>
            </select>
            <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} className="input-dark min-h-[80px] resize-y mb-3" placeholder="Additional details (optional)..." />
            <div className="flex gap-2">
              <button onClick={submitReport} disabled={!reportReason || reporting} className="btn-purple flex-1">{reporting ? "Submitting..." : "Submit Report"}</button>
              <button onClick={() => setShowReport(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
