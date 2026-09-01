"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield, Users, Flag, Ban, Loader2, Activity, AlertTriangle, TrendingUp, MessageSquare, Crown } from "lucide-react";

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({ users: 0, posts: 0, comments: 0, reports: 0, bans: 0, online: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "ADMIN" && role !== "MODERATOR" && role !== "FOUNDER") {
        router.push("/");
        return;
      }
      fetch("/api/admin/stats").then(r => r.json()).then(d => {
        setStats(d);
        setRecentReports(d.recentReports || []);
        setRecentUsers(d.recentUsers || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [status, session, router]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield size={24} className="text-red-400" />
        <h1 className="text-2xl font-bold text-white">{(session?.user as any)?.role === "FOUNDER" || (session?.user as any)?.isFounder ? "Founder Portal" : "Admin Portal"}</h1>
        <span className={`badge ${(session?.user as any)?.role === "FOUNDER" || (session?.user as any)?.isFounder ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "badge-admin"}`}>{(session?.user as any)?.role === "FOUNDER" || (session?.user as any)?.isFounder ? "FOUNDER" : "ADMIN"}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Users", value: stats.users, icon: Users, color: "text-purple-400" },
          { label: "Posts", value: stats.posts, icon: TrendingUp, color: "text-blue-400" },
          { label: "Comments", value: stats.comments, icon: MessageSquare, color: "text-green-400" },
          { label: "Reports", value: stats.reports, icon: Flag, color: "text-yellow-400" },
          { label: "Bans", value: stats.bans, icon: Ban, color: "text-red-400" },
          { label: "Online", value: stats.online, icon: Activity, color: "text-emerald-400" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-3 text-center">
              <Icon size={20} className={`${s.color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <Link href="/admin/users" className="card p-4 glass-hover transition-all flex items-center gap-3">
          <Users size={20} className="text-purple-400" />
          <div><div className="font-semibold text-white text-sm">User Management</div><div className="text-xs text-slate-500">Roles, bans, warnings</div></div>
        </Link>
        <Link href="/admin/reports" className="card p-4 glass-hover transition-all flex items-center gap-3">
          <Flag size={20} className="text-yellow-400" />
          <div><div className="font-semibold text-white text-sm">Reports</div><div className="text-xs text-slate-500">{stats.reports} open reports</div></div>
        </Link>
        <Link href="/admin/bans" className="card p-4 glass-hover transition-all flex items-center gap-3">
          <Ban size={20} className="text-red-400" />
          <div><div className="font-semibold text-white text-sm">Ban Management</div><div className="text-xs text-slate-500">Active and lifted bans</div></div>
        </Link>
        <Link href="/admin/rules" className="card p-4 glass-hover transition-all flex items-center gap-3">
          <Shield size={20} className="text-purple-400" />
          <div><div className="font-semibold text-white text-sm">Community Rules</div><div className="text-xs text-slate-500">Manage rules page</div></div>
        </Link>
      </div>

      {/* Recent reports */}
      <div className="card p-4 mb-6">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-400" /> Recent Reports</h3>
        {recentReports.length === 0 ? (
          <p className="text-slate-500 text-sm">No reports</p>
        ) : (
          <div className="space-y-2">
            {recentReports.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{r.reason} - {r.targetType}</span>
                <span className={`badge ${r.status === "OPEN" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent users */}
      <div className="card p-4">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Users size={16} className="text-purple-400" /> New Users</h3>
        {recentUsers.length === 0 ? (
          <p className="text-slate-500 text-sm">No users yet</p>
        ) : (
          <div className="space-y-2">
            {recentUsers.map((u: any) => (
              <Link key={u.id} href={`/u/${u.username}`} className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-purple-400">{u.username}</span>
                <span className="text-slate-500 text-xs">{u.email}</span>
                <span className="text-slate-600 text-xs ml-auto">{new Date(u.joinedAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
