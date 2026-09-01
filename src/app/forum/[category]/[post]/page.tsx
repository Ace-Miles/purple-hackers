"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUp, ArrowDown, MessageSquare, Eye, Pin, Lock, Loader2, Send, AlertCircle, Edit, Trash2, Save, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

  const fetchData = () => {
    fetch(`/api/posts/${postSlug}`).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [postSlug]);

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
            {post.author.role === "ADMIN" && <span className="badge badge-admin text-[9px]">ADMIN</span>}
            {post.author.role === "MODERATOR" && <span className="badge badge-mod text-[9px]">MOD</span>}
          </Link>
          <span>{timeAgo(post.createdAt)}</span>
          {post.editedAt && <span className="italic">(edited)</span>}
          <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
        </div>

        {!editing && (
          <div className="prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              code({ node, className, children, ...props }: any) {
                const isInline = !className?.includes("language-");
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 text-sm break-words" {...props}>{children}</code>
                ) : (
                  <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto">
                    <code className="text-sm text-slate-300" {...props}>{children}</code>
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
                <video key={i} src={url} controls className="rounded-lg w-full max-h-80 object-contain bg-black" />
              ) : (
                <img key={i} src={url} alt="" className="rounded-lg w-full max-h-80 object-contain bg-black" />
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
          <button onClick={() => vote(post.id, "up")} className="flex items-center gap-1 text-sm text-slate-400 hover:text-purple-400 transition-all">
            <ArrowUp size={16} /> {post.upvotes}
          </button>
          <button onClick={() => vote(post.id, "down")} className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400 transition-all">
            <ArrowDown size={16} /> {post.downvotes}
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
                    {c.author.role === "ADMIN" && <span className="badge badge-admin text-[9px]">ADMIN</span>}
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
                    <div className="text-sm text-slate-300 prose prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.content}</ReactMarkdown>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-400"><ArrowUp size={12} /> {c.upvotes}</button>
                    {session && (
                      <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-xs text-slate-500 hover:text-purple-400">Reply</button>
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
    </div>
  );
}
