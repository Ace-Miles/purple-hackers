"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, Eye, ArrowUp, Pin, Lock, Plus, Terminal, Loader2, ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { timeAgo } from "@/lib/utils";

export default function CategoryPage() {
  const { category: categorySlug } = useParams() as { category: string };
  const { data: session } = useSession();
  const [category, setCategory] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    Promise.all([
      fetch("/api/posts/categories").then(r => r.json()),
      fetch(`/api/posts?category=${categorySlug}&sort=recent`).then(r => r.json()),
    ]).then(([catData, postData]) => {
      const cat = (catData.categories || []).find((c: any) => c.slug === categorySlug);
      if (!cat) { setNotFound(true); setLoading(false); return; }
      setCategory(cat);
      setPosts(postData.posts || []);
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [categorySlug]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  if (notFound) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <Terminal size={48} className="text-slate-700 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-white mb-2">Category not found</h1>
      <Link href="/forum" className="text-purple-400 text-sm inline-flex items-center gap-1"><ArrowLeft size={14} /> Back to forum</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Link href="/forum" className="hover:text-purple-400 flex items-center gap-1"><ArrowLeft size={12} /> Forum</Link>
      </div>

      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-purple-gradient break-words">{category.name}</h1>
          <p className="text-sm text-slate-400 mt-1 break-words">{category.description}</p>
        </div>
        {session && (
          <Link href="/forum/new" className="btn-purple flex items-center gap-2 shrink-0">
            <Plus size={18} /> New Post
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="card p-16 text-center">
          <Terminal size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-300 font-semibold mb-1">No posts in this category yet</h3>
          <p className="text-slate-500 text-sm">{session ? "Be the first to post!" : "Sign in to start posting"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post: any, i: number) => (
            <Link key={post.id} href={`/forum/${categorySlug}/${post.slug}`}
              className="card p-4 glass-hover transition-all block group fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center shrink-0 w-12">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/5 group-hover:bg-purple-500/10 flex flex-col items-center justify-center transition-all">
                    <ArrowUp size={14} className="text-purple-400" />
                    <span className="text-sm font-bold text-white">{post.upvotes - post.downvotes}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {post.isPinned && <span className="flex items-center gap-0.5 text-xs text-yellow-500"><Pin size={11} /> Pinned</span>}
                    {post.isLocked && <span className="flex items-center gap-0.5 text-xs text-red-400"><Lock size={11} /> Locked</span>}
                  </div>
                  <h3 className="font-semibold text-white text-sm md:text-base mb-1 group-hover:text-purple-400 transition-colors line-clamp-1 break-words">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-2 line-clamp-1 break-words">{post.content?.replace(/[#*`>\-]/g, '').slice(0, 150)}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[8px] font-bold text-white">
                        {post.author?.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-purple-400 font-medium">{post.author?.username}</span>
                    </span>
                    <span>{timeAgo(post.createdAt)}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} /> {post._count?.comments || 0}</span>
                    <span className="flex items-center gap-1"><Eye size={11} /> {post.views}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
