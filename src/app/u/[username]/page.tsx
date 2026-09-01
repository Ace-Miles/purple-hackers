"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2, GitBranch, Globe, MapPin, Calendar, Terminal, MessageSquare, ArrowUp, Send, UserPlus, UserCheck, Shield, Crown, Award, Zap } from "lucide-react";
import { timeAgo } from "@/lib/utils";

function getRepLevel(rep: number) {
  if (rep >= 500) return { label: "Legend", color: "text-amber-400", icon: "👑" };
  if (rep >= 250) return { label: "Expert", color: "text-purple-400", icon: "💎" };
  if (rep >= 100) return { label: "Pro", color: "text-blue-400", icon: "🔥" };
  if (rep >= 25) return { label: "Skilled", color: "text-green-400", icon: "⚡" };
  if (rep >= 5) return { label: "Rookie", color: "text-slate-400", icon: "🌱" };
  return { label: "Newbie", color: "text-slate-600", icon: "✨" };
}

export default function Profile() {
  const { username } = useParams() as { username: string };
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [tab, setTab] = useState<"posts" | "stats" | "badges">("posts");
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/profile/${username}`).then(r => r.json()).then(d => {
      setUser(d.user);
      setPosts(d.posts || []);
      setIsFollowing(!!d.isFollowing);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [username]);

  const toggleFollow = async () => {
    if (!session) { router.push("/login"); return; }
    setFollowBusy(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setUser((prev: any) => prev ? { ...prev, followersCount: prev.followersCount + (wasFollowing ? -1 : 1) } : prev);
    try {
      const res = await fetch(`/api/follow/${username}`, { method: "POST" });
      if (!res.ok) {
        setIsFollowing(wasFollowing);
        setUser((prev: any) => prev ? { ...prev, followersCount: prev.followersCount + (wasFollowing ? 1 : -1) } : prev);
      }
    } catch {
      setIsFollowing(wasFollowing);
      setUser((prev: any) => prev ? { ...prev, followersCount: prev.followersCount + (wasFollowing ? 1 : -1) } : prev);
    }
    setFollowBusy(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;
  if (!user) return <div className="text-center py-20 text-slate-400">User not found</div>;

  const isSelf = (session?.user as any)?.username === user.username;
  const repLevel = getRepLevel(user.reputation || 0);
  const badges: string[] = (user as any).badges || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
              {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.username.slice(0, 2).toUpperCase()}
            </div>
            {(user as any).isFounder && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                <Crown size={12} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{user.username}</h1>
                {user.role === "ADMIN" && (
                  <span className="role-badge role-badge-admin shrink-0" title="Admin">
                    <Shield size={10} />
                  </span>
                )}
                {(user as any).isFounder && (
                  <span className="role-badge role-badge-founder shrink-0" title="Founder">
                    <Crown size={10} />
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold text-purple-400">{user.reputation}</div>
                <div className="text-[10px] text-slate-500">REPUTATION</div>
              </div>
            </div>
            {user.title && <p className="text-sm text-purple-400 mb-1 break-words">{user.title}</p>}
            {user.bio && <p className="text-sm text-slate-400 mb-2 break-words">{user.bio}</p>}
            
            {/* Reputation level bar */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs">{repLevel.icon}</span>
              <span className={`text-xs font-semibold ${repLevel.color}`}>{repLevel.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full purple-gradient transition-all" style={{ width: `${Math.min(100, (user.reputation / 500) * 100)}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1"><Calendar size={12} /> Joined {timeAgo(user.joinedAt)}</span>
              {user.location && <span className="flex items-center gap-1 break-words"><MapPin size={12} /> {user.location}</span>}
              {user.github && <a href={`https://github.com/${user.github}`} target="_blank" className="flex items-center gap-1 hover:text-purple-400 break-all"><GitBranch size={12} /> {user.github}</a>}
              {user.website && <a href={user.website} target="_blank" className="flex items-center gap-1 hover:text-purple-400 break-all"><Globe size={12} /> {user.website}</a>}
            </div>
            <div className="flex items-center gap-4 mb-3">
              <button onClick={() => setTab("stats")} className="text-sm hover:text-purple-400 transition-colors">
                <span className="font-bold text-white">{user.followersCount}</span> <span className="text-slate-500">Followers</span>
              </button>
              <button onClick={() => setTab("stats")} className="text-sm hover:text-purple-400 transition-colors">
                <span className="font-bold text-white">{user.followingCount}</span> <span className="text-slate-500">Following</span>
              </button>
            </div>
            {!isSelf && session && (
              <div className="flex items-center gap-2">
                <button onClick={toggleFollow} disabled={followBusy}
                  className={`group inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${isFollowing ? "bg-slate-800 text-slate-300 hover:bg-red-500/10 hover:text-red-400" : "btn-purple"}`}>
                  {isFollowing ? (
                    <>
                      <UserCheck size={13} className="group-hover:hidden" />
                      <span className="group-hover:hidden">Following</span>
                      <span className="hidden group-hover:inline">Unfollow</span>
                    </>
                  ) : (
                    <><UserPlus size={13} /> Follow</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-800">
        {(["posts", "stats", "badges"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-all ${tab === t ? "text-purple-400 border-b-2 border-purple-500" : "text-slate-500 hover:text-slate-300"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {tab === "posts" && (
        <>
          <h2 className="text-lg font-bold text-white mb-3">Recent Posts</h2>
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">No posts yet</div>
          ) : (
            <div className="space-y-2">
              {posts.map((p: any) => (
                <Link key={p.id} href={`/forum/${p.category?.slug || "general"}/${p.slug}`}
                  className="card p-3 glass-hover transition-all block">
                  <h3 className="text-sm font-medium text-white hover:text-purple-400 break-words">{p.title}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span><ArrowUp size={10} className="inline" /> {p.upvotes - p.downvotes}</span>
                    <span><MessageSquare size={10} className="inline" /> {p._count?.comments || 0}</span>
                    <span>{timeAgo(p.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Stats tab */}
      {tab === "stats" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="card p-4 text-center"><Terminal size={20} className="text-purple-400 mx-auto mb-1" /><div className="text-2xl font-bold text-white">{user.postsCount}</div><div className="text-xs text-slate-500">Posts</div></div>
          <div className="card p-4 text-center"><MessageSquare size={20} className="text-blue-400 mx-auto mb-1" /><div className="text-2xl font-bold text-white">{user.commentsCount}</div><div className="text-xs text-slate-500">Comments</div></div>
          <div className="card p-4 text-center"><ArrowUp size={20} className="text-green-400 mx-auto mb-1" /><div className="text-2xl font-bold text-white">{user.reputation}</div><div className="text-xs text-slate-500">Reputation</div></div>
          <div className="card p-4 text-center"><UserCheck size={20} className="text-pink-400 mx-auto mb-1" /><div className="text-2xl font-bold text-white">{user.followersCount}</div><div className="text-xs text-slate-500">Followers</div></div>
          <div className="card p-4 text-center"><UserPlus size={20} className="text-indigo-400 mx-auto mb-1" /><div className="text-2xl font-bold text-white">{user.followingCount}</div><div className="text-xs text-slate-500">Following</div></div>
          <div className="card p-4 text-center"><Zap size={20} className="text-amber-400 mx-auto mb-1" /><div className="text-2xl font-bold text-white">{repLevel.label}</div><div className="text-xs text-slate-500">Level</div></div>
        </div>
      )}

      {/* Badges tab */}
      {tab === "badges" && (
        <div className="space-y-3">
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {badges.map((badge, i) => (
                <div key={i} className="card p-4 text-center">
                  <div className="text-2xl mb-1">{badge.split(" ")[0]}</div>
                  <div className="text-sm font-medium text-white">{badge.split(" ").slice(1).join(" ")}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-500 text-sm">
              <Award size={32} className="mx-auto mb-2 text-slate-700" />
              No badges yet. Earn them through contributions!
            </div>
          )}
          {(user as any).acemilesOsConnected && (
            <div className="card p-3 flex items-center gap-2 border-purple-500/20">
              <Terminal size={16} className="text-purple-400" />
              <span className="text-sm text-purple-400">Connected with Acemiles OS</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
