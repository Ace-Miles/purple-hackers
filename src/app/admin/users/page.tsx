"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Shield, Ban, UserCheck, UserX, Loader2, ArrowLeft, ShieldAlert, ChevronUp, Crown } from "lucide-react";

export default function AdminUsers() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") { router.push("/"); return; }
      fetchUsers();
    }
  }, [status, session, router]);

  const fetchUsers = (q?: string) => {
    setLoading(true);
    fetch(`/api/admin/users${q ? `?search=${q}` : ""}`).then(r => r.json()).then(d => {
      setUsers(d.users || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleAction = async (userId: string, action: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const d = await res.json();
    if (!res.ok) alert(d.error || "Action failed");
    fetchUsers(search);
  };

  const myRole = (session?.user as any)?.role;
  const canManage = myRole === "ADMIN" || myRole === "FOUNDER";
  const isFounderUser = myRole === "FOUNDER";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-400 hover:text-purple-400 mb-4">
        <ArrowLeft size={16} /> Back to Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">User Management</h1>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") fetchUsers(search); }}
            className="input-dark pl-10" placeholder="Search users..." />
        </div>
        <button onClick={() => fetchUsers(search)} className="btn-purple">Search</button>
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-purple-500" /></div> : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u.id} className="card p-3 flex items-center gap-3">
              <Link href={`/u/${u.username}`}>
                <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{u.username}</span>
                  {u.isFounder && <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">FOUNDER</span>}
                  {!u.isFounder && u.role === "ADMIN" && <span className="badge badge-admin text-[9px]">ADMIN</span>}
                  {!u.isFounder && u.role === "FOUNDER" && <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">FOUNDER</span>}
                  {u.role === "MODERATOR" && <span className="badge badge-mod text-[9px]">MOD</span>}
                  {u.status === "BANNED" && <span className="badge bg-red-500/20 text-red-400 text-[9px]">BANNED</span>}
                </div>
                <div className="text-xs text-slate-500">{u.email} · {u.postsCount} posts · {u.reputation} rep</div>
              </div>
              {u.isFounder ? (
                <span className="text-[10px] text-amber-400 flex items-center gap-1 shrink-0"><Crown size={12} /> Protected</span>
              ) : canManage && (
                <div className="flex gap-1">
                  {u.role !== "MODERATOR" && u.role !== "ADMIN" && (
                    <button onClick={() => handleAction(u.id, "promote_mod")} title="Promote to Mod"
                      className="p-2 rounded-lg hover:bg-green-500/10 text-green-400"><Shield size={14} /></button>
                  )}
                  {u.role !== "ADMIN" && isFounderUser && (
                    <button onClick={() => handleAction(u.id, "promote_admin")} title="Promote to Admin"
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"><ShieldAlert size={14} /></button>
                  )}
                  {u.role !== "MEMBER" && (
                    <button onClick={() => handleAction(u.id, "demote")} title="Remove Admin / Demote"
                      className="p-2 rounded-lg hover:bg-slate-500/10 text-slate-400"><ChevronUp size={14} /></button>
                  )}
                  {u.status !== "BANNED" ? (
                    <button onClick={() => handleAction(u.id, "ban")} title="Ban"
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"><Ban size={14} /></button>
                  ) : (
                    <button onClick={() => handleAction(u.id, "unban")} title="Unban"
                      className="p-2 rounded-lg hover:bg-green-500/10 text-green-400"><UserCheck size={14} /></button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
