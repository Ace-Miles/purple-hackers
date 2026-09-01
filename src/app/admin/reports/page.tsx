"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flag, Loader2, ArrowLeft, Check, X } from "lucide-react";

export default function AdminReports() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") { router.push("/"); return; }
      fetch("/api/admin/reports").then(r => r.json()).then(d => { setReports(d.reports || []); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [status, session, router]);

  const resolve = async (id: string, action: string) => {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setReports(prev => prev.filter((r: any) => r.id !== id));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-400 hover:text-purple-400 mb-4">
        <ArrowLeft size={16} /> Back to Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">Reports</h1>

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <Flag size={48} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No open reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r: any) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="badge bg-yellow-500/10 text-yellow-400">{r.reason}</span>
                <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-300 mb-2">{r.description || "No description"}</p>
              <div className="text-xs text-slate-500 mb-3">Target: {r.targetType} ({r.targetId})</div>
              <div className="flex gap-2">
                <button onClick={() => resolve(r.id, "resolve")} className="btn-ghost text-xs flex items-center gap-1 text-green-400">
                  <Check size={14} /> Resolve
                </button>
                <button onClick={() => resolve(r.id, "dismiss")} className="btn-ghost text-xs flex items-center gap-1 text-red-400">
                  <X size={14} /> Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
