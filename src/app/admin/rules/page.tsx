"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ScrollText, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminRules() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", order: 0 });

  const fetchRules = () => {
    fetch("/api/rules").then(r => r.json()).then(d => {
      setRules(d.rules || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "FOUNDER") { router.push("/"); return; }
      fetchRules();
    }
  }, [status, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/rules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ title: "", description: "", order: 0 });
    fetchRules();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
    fetchRules();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-400 hover:text-purple-400 mb-4">
        <ArrowLeft size={16} /> Back to Admin
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ScrollText size={24} className="text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Manage Rules</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-purple flex items-center gap-1">
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-4 mb-4 space-y-3 fade-in">
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="Rule title" required />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-dark min-h-[80px] resize-y" placeholder="Rule description" required />
          <div className="flex gap-2">
            <button type="submit" className="btn-purple">Save Rule</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {rules.map((r: any, i: number) => (
          <div key={r.id} className="card p-3 flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center text-sm font-bold text-purple-400 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">{r.title}</h3>
              <p className="text-xs text-slate-500 mt-1 break-words">{r.description}</p>
            </div>
            <button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {rules.length === 0 && <div className="card p-8 text-center text-slate-500 text-sm">No rules yet. Add some!</div>}
      </div>
    </div>
  );
}
