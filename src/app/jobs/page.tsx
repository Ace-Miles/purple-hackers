"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Briefcase, ExternalLink, Plus, Search, Loader2, MapPin, Clock, Check, X, Trash2, Filter } from "lucide-react";

const JOB_TYPES = ["full-time", "part-time", "internship", "contract", "freelance"];

export default function JobsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ title: "", company: "", description: "", type: "full-time", location: "remote", url: "", salary: "", tags: "" });

  const fetchJobs = (q?: string, type?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (type && type !== "all") params.set("type", type);
    params.set("approved", "true");
    fetch(`/api/jobs?${params}`).then(r => r.json()).then(d => {
      setJobs(d.jobs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", company: "", description: "", type: "full-time", location: "remote", url: "", salary: "", tags: "" });
      fetchJobs(search, filterType);
      alert("Job posted! It will appear after admin approval.");
    }
  };

  const filtered = jobs.filter((j: any) =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())
  ).filter((j: any) => filterType === "all" || j.type === filterType);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Briefcase size={24} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Job Board</h1>
        <span className="text-xs text-slate-500">Tech opportunities only</span>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-dark pl-10" placeholder="Search jobs..." />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-dark w-auto">
          <option value="all">All Types</option>
          {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {session && (
          <button onClick={() => setShowForm(!showForm)} className="btn-purple flex items-center gap-1 shrink-0">
            <Plus size={16} /> Post
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-4 mb-4 space-y-3 fade-in">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="Job title" required />
            <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="input-dark" placeholder="Company" required />
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-dark min-h-[80px] resize-y" placeholder="Job description..." required />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-dark">
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-dark" placeholder="Location (e.g. remote, Lagos)" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="input-dark" placeholder="Salary (optional)" />
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="input-dark" placeholder="Apply URL (optional)" />
          </div>
          <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="input-dark" placeholder="Tags (comma-separated: react, security, etc.)" />
          <div className="flex gap-2">
            <button type="submit" className="btn-purple">Post Job</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-purple-500" /></div> : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">No jobs posted yet.</div>
          ) : filtered.map((j: any) => (
            <div key={j.id} className="card p-4 glass-hover transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white">{j.title}</h3>
                  <p className="text-xs text-purple-400 mt-0.5">{j.company}</p>
                  <p className="text-sm text-slate-400 mt-2 break-words line-clamp-2">{j.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="badge bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{j.type}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> {j.location}</span>
                    {j.salary && <span className="text-xs text-green-400">{j.salary}</span>}
                    {j.tags?.map((t: string) => <span key={t} className="text-[10px] text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-600 flex items-center gap-1"><Clock size={10} /> {new Date(j.createdAt).toLocaleDateString()}</span>
                    {j.url && <a href={j.url} target="_blank" rel="noopener" className="text-xs text-purple-400 hover:underline flex items-center gap-1"><ExternalLink size={10} /> Apply</a>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
