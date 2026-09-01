"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare, Eye, Pin, Lock, Plus, Terminal, Loader2, Flame, Search, Filter, Heart, ThumbsDown, Shield, Crown, BadgeCheck, Award } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";

export default function Forum() {
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [search, setSearch] = useState("");
  const [followBusy, setFollowBusy] = useState<string | null>(null);
  const [revealedBadges, setRevealedBadges] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/posts?sort=" + sortBy + (selectedCat !== "all" ? "&category=" + selectedCat : ""))
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/posts/categories")
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {});
  }, [selectedCat, sortBy]);

  const filtered = posts.filter((p: any) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBadge = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRevealedBadges(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const vote = async (e: React.MouseEvent, postId: string, type: "up" | "down") => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) { router.push("/login"); return; }

    setPosts(prev => prev.map((p: any) => {
      if (p.id !== postId) return p;
      const prevReaction = p.myReaction;
      let upvotes = p.upvotes, downvotes = p.downvotes, myReaction: "up" | "down" | null = type;
      if (prevReaction === type) {
        // toggle off
        if (type === "up") upvotes--; else downvotes--;
        myReaction = null;
      } else {
        if (type === "up") { upvotes++; if (prevReaction === "down") downvotes--; }
        else { downvotes++; if (prevReaction === "up") upvotes--; }
      }
      return { ...p, upvotes, downvotes, myReaction };
    }));

    try {
      await fetch("/api/posts/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, type }),
      });
    } catch {}
  };

  const toggleFollow = async (e: React.MouseEvent, username: string, authorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) { router.push("/login"); return; }
    setFollowBusy(authorId);

    setPosts(prev => prev.map((p: any) => p.authorId === authorId ? { ...p, isFollowingAuthor: !p.isFollowingAuthor } : p));

    try {
      await fetch(`/api/follow/${username}`, { method: "POST" });
    } catch {}
    setFollowBusy(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-gradient">Forum</h1>
          <p className="text-sm text-slate-400 mt-1">Discussions, exploits, and knowledge sharing</p>
        </div>
        {session && (
          <Link href="/forum/new" className="btn-purple flex items-center gap-2 hidden sm:flex">
            <Plus size={18} /> New Post
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="input-dark pl-10" placeholder="Search posts..." />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setSelectedCat("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCat === "all" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-slate-800/50 text-slate-400 hover:bg-purple-500/10 hover:text-purple-400"}`}>
          All
        </button>
        {categories.map((cat: any) => (
          <button key={cat.id} onClick={() => setSelectedCat(cat.slug)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${selectedCat === cat.slug ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-slate-800/50 text-slate-400 hover:bg-purple-500/10 hover:text-purple-400"}`}>
            {cat.isLocked && <Lock size={10} />}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
        <span className="text-xs text-slate-500 flex items-center gap-1"><Filter size={12} /> Sort:</span>
        {[
          { key: "recent", label: "Recent" },
          { key: "top", label: "Top" },
          { key: "hot", label: "Hot" },
        ].map(s => (
          <button key={s.key} onClick={() => setSortBy(s.key)}
            className={`text-xs font-medium transition-all ${sortBy === s.key ? "text-purple-400" : "text-slate-500 hover:text-slate-300"}`}>
            {s.label}
          </button>
        ))}
        <span className="text-xs text-slate-600 ml-auto">{filtered.length} posts</span>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-purple-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Terminal size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-300 font-semibold mb-1">No posts found</h3>
          <p className="text-slate-500 text-sm">{search ? "Try a different search" : session ? "Be the first to post!" : "Sign in to start posting"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post: any, i) => (
            <div key={post.id} className="card overflow-hidden fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
              {/* Author row — Instagram-style */}
              <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
                <Link href={`/u/${post.author?.username}`} className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0">
                  {post.author?.avatar ? (
                    <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    post.author?.username?.slice(0, 2).toUpperCase()
                  )}
                </Link>
                <Link href={`/u/${post.author?.username}`} className="text-sm font-semibold text-white hover:text-purple-400 transition-colors truncate">
                  {post.author?.username}
                </Link>
                {post.author?.role === "ADMIN" && (
                  <button
                    onClick={(e) => toggleBadge(e, `admin-${post.id}`)}
                    className={`role-badge role-badge-admin ${revealedBadges.has(`admin-${post.id}`) ? "role-badge-revealed" : ""}`}
                    title="Admin">
                    {revealedBadges.has(`admin-${post.id}`) ? "ADMIN" : <Shield size={10} />}
                  </button>
                )}
                {post.author?.isFounder && (
                  <button
                    onClick={(e) => toggleBadge(e, `founder-${post.id}`)}
                    className={`role-badge role-badge-founder ${revealedBadges.has(`founder-${post.id}`) ? "role-badge-revealed" : ""}`}
                    title="Founder">
                    {revealedBadges.has(`founder-${post.id}`) ? "FOUNDER" : <Crown size={10} />}
                  </button>
                )}
                {post.author?.verified && !post.author?.isFounder && (
                  <span title="Verified Member (999+ rep)" className="shrink-0"><BadgeCheck size={14} className="text-purple-400" /></span>
                )}
                {post.isOwnPost === false && post.isFollowingAuthor !== null && (
                  <button
                    disabled={followBusy === post.authorId}
                    onClick={(e) => toggleFollow(e, post.author?.username, post.authorId)}
                    className={`follow-btn ${post.isFollowingAuthor ? "following" : "not-following"}`}>
                    {post.isFollowingAuthor ? "Following" : "Follow"}
                  </button>
                )}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 ml-auto shrink-0">
                  {post.category?.name || "General"}
                </span>
              </div>

              {/* Content */}
              <Link href={`/forum/${post.category?.slug || "general"}/${post.slug}`} className="block px-4 pb-2 group">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {post.isPinned && <span className="flex items-center gap-0.5 text-xs text-yellow-500"><Pin size={11} /> Pinned</span>}
                  {post.isLocked && <span className="flex items-center gap-0.5 text-xs text-red-400"><Lock size={11} /> Locked</span>}
                  {post.upvotes > 50 && <span className="flex items-center gap-0.5 text-xs text-orange-500"><Flame size={11} /> Hot</span>}
                </div>
                <h3 className="font-semibold text-white text-sm md:text-base mb-1 group-hover:text-purple-400 transition-colors line-clamp-1">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-500 mb-1 line-clamp-2">{post.content?.replace(/[#*`>\-]/g, '').slice(0, 180)}</p>
                {post.mediaUrls?.[0] && (
                  <img src={post.mediaUrls[0]} alt="" className="mt-2 rounded-lg max-h-64 object-cover w-full border border-slate-800" />
                )}
              </Link>

              {/* Action bar — like / dislike / comments / views */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-800/70">
                <button onClick={(e) => vote(e, post.id, "up")} className="flex items-center gap-1.5 group">
                  <Heart
                    size={20}
                    className={`like-btn ${post.myReaction === "up" ? "liked" : "text-slate-400 group-hover:text-purple-300"}`}
                    fill={post.myReaction === "up" ? "currentColor" : "none"}
                  />
                  <span className={`text-xs font-medium ${post.myReaction === "up" ? "text-purple-300" : "text-slate-500"}`}>{post.upvotes}</span>
                </button>
                <button onClick={(e) => vote(e, post.id, "down")} className="flex items-center gap-1.5 group">
                  <ThumbsDown
                    size={18}
                    className={`dislike-btn ${post.myReaction === "down" ? "disliked" : "text-slate-400 group-hover:text-rose-300"}`}
                    fill={post.myReaction === "down" ? "currentColor" : "none"}
                  />
                  <span className={`text-xs font-medium ${post.myReaction === "down" ? "text-rose-400" : "text-slate-500"}`}>{post.downvotes}</span>
                </button>
                <Link href={`/forum/${post.category?.slug || "general"}/${post.slug}`} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                  <MessageSquare size={16} /> <span className="text-xs font-medium">{post._count?.comments || 0}</span>
                </Link>
                <span className="flex items-center gap-1.5 text-slate-500 ml-auto">
                  <Eye size={14} /> <span className="text-xs">{post.views}</span>
                </span>
                <span className="text-xs text-slate-600">{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile FAB for new post */}
      {session && (
        <Link href="/forum/new" className="sm:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full purple-gradient flex items-center justify-center shadow-lg shadow-purple-500/40 z-40">
          <Plus size={24} className="text-white" />
        </Link>
      )}
    </div>
  );
}
