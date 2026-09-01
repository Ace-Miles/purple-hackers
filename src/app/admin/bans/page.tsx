"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, Loader2, ArrowLeft, UserCheck } from "lucide-react";

export default function AdminBans() {
  const { data: session, status } = useSession();
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") { router.push("/"); return; }
      fetch("/api/admin/bans").then(r => r.json()).then(d => { setBans(d.bans || []); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [status, session, router]);

  const liftBan = async (banId: string, userId: string) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "unban" }),
    });
    setBans(prev => prev.filter((b: any) => b.id !== banId));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-400 hover:text-purple-400 mb-4">
        <ArrowLeft size={16} /> Back to Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">Ban Management</h1>

      {bans.length === 0 ? (
        <div className="card p-12 text-center">
          <Ban size={48} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No active bans</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bans.map((b: any) => (
            <div key={b.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{b.userId}</div>
                <div className="text-xs text-slate-500">{b.reason} · {b.type}</div>
                <div className="text-xs text-slate-600">Banned: {new Date(b.createdAt).toLocaleDateString()}</div>
              </div>
              {(session?.user as any)?.role === "ADMIN" && (
                <button onClick={() => liftBan(b.id, b.userId)} className="btn-ghost text-xs flex items-center gap-1 text-green-400">
                  <UserCheck size={14} /> Lift Ban
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
