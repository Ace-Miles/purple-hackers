"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Terminal, Loader2, AlertCircle, X, ImagePlus, Film } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function NewPost() {
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [media, setMedia] = useState<{ url: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    fetch("/api/posts/categories").then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, [status, router]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files).slice(0, 4 - media.length)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "post");
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (res.ok) {
          setMedia(prev => [...prev, { url: d.url, type: d.type }]);
        } else {
          setError(d.error || "Upload failed");
        }
      } catch {
        setError("Upload failed");
      }
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!content && media.length === 0) || !category) {
      setError("Title, category, and content or media are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, content, categorySlug: category,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          mediaUrls: media.map(m => m.url),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create post");
        setLoading(false);
        return;
      }
      router.push(`/forum/${category}/${data.post.slug}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (status === "loading") return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;
  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Terminal size={24} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">New Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Title</label>
          <input type="text" maxLength={200} value={title} onChange={e => setTitle(e.target.value)}
            className="input-dark" placeholder="Give your post a title..." />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-dark">
            <option value="">Select category...</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.slug} disabled={cat.isLocked}>{cat.name}{cat.isLocked ? " (locked)" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Tags (comma separated)</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            className="input-dark" placeholder="exploit, 0day, rce" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-400">Content (Markdown supported)</label>
            <button type="button" onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-purple-400 hover:text-purple-300">{showPreview ? "Edit" : "Preview"}</button>
          </div>
          {showPreview ? (
            <div className="input-dark min-h-[200px] p-4 prose prose-invert prose-sm max-w-none break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing to preview*"}</ReactMarkdown>
            </div>
          ) : (
            <textarea value={content} onChange={e => setContent(e.target.value)}
              className="input-dark min-h-[200px] resize-y font-mono text-sm"
              placeholder="Write your post... Markdown is supported.&#10;&#10;```python&#10;print('Hello')&#10;```" />
          )}
        </div>

        {/* Media upload */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Images / Videos (up to 4)</label>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden
            onChange={e => handleFiles(e.target.files)} />
          <div className="flex flex-wrap gap-2">
            {media.map((m, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700 group">
                {m.type.startsWith("video") ? (
                  <video src={m.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
                <button type="button" onClick={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
            {media.length < 4 && (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-20 h-20 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-purple-400 hover:border-purple-500/50 transition-all">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <><ImagePlus size={18} /><span className="text-[10px]">Add</span></>}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading || uploading} className="btn-purple flex items-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : "Post"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
