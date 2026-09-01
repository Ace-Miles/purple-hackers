"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookOpen, ExternalLink, Pin, Plus, Search, Loader2, Trash2, Star, Filter } from "lucide-react";

const TYPE_ICONS: Record<string, string> = {
  tool: "🔧", course: "📚", ebook: "📖", other: "🔗",
};

const TYPE_COLORS: Record<string, string> = {
  tool: "text-cyan-400", course: "text-green-400", ebook: "text-amber-400", other: "text-purple-400",
};

export default function ResourcesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", url: "", type: "tool", category: "general" });

  const fetchResources = (q?: string, type?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (type && type !== "all") params.set("type", type);
    fetch(`/api/resources?${params}`).then(r => r.json()).then(d => {
      setResources(d.resources || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchResources(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/resources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", description: "", url: "", type: "tool", category: "general" });
      fetchResources(search, filterType);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    await fetch(`/api/resources/${id}`, { method: "DELETE" });
    fetchResources(search, filterType);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen size={24} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Resource Library</h1>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") fetchResources(search, filterType); }}
            className="input-dark pl-10" placeholder="Search resources..." />
        </div>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); fetchResources(search, e.target.value); }}
          className="input-dark w-auto">
          <option value="all">All</option>
          <option value="tool">Tools</option>
          <option value="course">Courses</option>
          <option value="ebook">Ebooks</option>
          <option value="other">Other</option>
        </select>
        {session && (
          <button onClick={() => setShowForm(!showForm)} className="btn-purple flex items-center gap-1 shrink-0">
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={submit} className="card p-4 mb-4 space-y-3 fade-in">
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="input-dark" placeholder="Resource title" required />
          <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="input-dark" placeholder="Short description (optional)" />
          <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
            className="input-dark" placeholder="https://..." required />
          <div className="flex gap-2">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-dark flex-1">
              <option value="tool">Tool</option>
              <option value="course">Course</option>
              <option value="ebook">Ebook</option>
              <option value="other">Other</option>
            </select>
            <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="input-dark flex-1" placeholder="Category (e.g. web, crypto)" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-purple">Submit</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {/* Resources list */}
      {loading ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-purple-500" /></div> : (
        <div className="space-y-2">
          {resources.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">No resources yet. Be the first to add one!</div>
          ) : resources.map((r: any) => (
            <div key={r.id} className="card p-4 glass-hover transition-all">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{TYPE_ICONS[r.type] || "🔗"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">{r.title}</h3>
                    {r.isPinned && <Pin size={12} className="text-purple-400 shrink-0" />}
                  </div>
                  {r.description && <p className="text-xs text-slate-500 mt-1 break-words">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <a href={r.url} target="_blank" rel="noopener" className={`text-xs flex items-center gap-1 ${TYPE_COLORS[r.type] || "text-purple-400"} hover:underline`}>
                      <ExternalLink size={12} /> Open
                    </a>
                    <span className="text-xs text-slate-600 capitalize">{r.type}</span>
                    <span className="text-xs text-slate-600">· {r.category}</span>
                    {r.submitter && (
                      <span className="text-xs text-slate-600">· by @{r.submitter.username}</span>
                    )}
                    {r.upvotes > 0 && <span className="text-xs text-slate-600 flex items-center gap-1"><Star size={10} /> {r.upvotes}</span>}
                  </div>
                </div>
                {session && (r.submittedBy === (session.user as any)?.id || ["ADMIN", "FOUNDER", "MODERATOR"].includes((session.user as any)?.role)) && (
                  <button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
