"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Users, MessageSquare, Shield, Lock, Bug, Code2, Search, ArrowRight, Globe, Activity, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, posts: 0, comments: 0, online: 0 });

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/forum");
    }
  }, [status, router]);

  if (status === "authenticated" || status === "loading") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-purple-900/20">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[150px]" />
        
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-mono text-purple-400/70 tracking-wider uppercase">Community · Security · Research</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 tracking-tight leading-[1.1]">
            Where security researchers<br/>
            <span className="text-purple-400">actually talk to each other.</span>
          </h1>
          
          <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
            A focused community for ethical hackers, reverse engineers, and security researchers. No noise, no fluff — just real discussions.
          </p>

          <div className="flex gap-3 items-center">
            {session ? (
              <>
                <Link href="/forum" className="bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2">
                  Go to Forum <ArrowRight size={18} />
                </Link>
                <Link href="/chat" className="text-slate-300 hover:text-white transition-colors font-medium px-6 py-3 rounded-lg border border-slate-700 hover:border-slate-600 flex items-center gap-2">
                  <Users size={18} /> Chat Rooms
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2">
                  Create Account <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="text-slate-300 hover:text-white transition-colors font-medium px-6 py-3 rounded-lg flex items-center gap-2">
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Stats inline */}
          <div className="mt-16 flex gap-8 text-sm">
            <div>
              <span className="text-2xl font-bold text-white">{stats.users}</span>
              <span className="text-slate-500 ml-2">members</span>
            </div>
            <div className="border-l border-slate-800 pl-8">
              <span className="text-2xl font-bold text-white">{stats.posts}</span>
              <span className="text-slate-500 ml-2">posts</span>
            </div>
            <div className="border-l border-slate-800 pl-8">
              <span className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {stats.online}
              </span>
              <span className="text-slate-500 ml-6">online</span>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-white mb-2">What this place is</h2>
        <p className="text-slate-500 mb-10">Straight to the point. Here's what you get.</p>
        
        <div className="grid md:grid-cols-2 gap-px bg-slate-800/50 rounded-xl overflow-hidden border border-slate-800">
          <div className="bg-[#0a0a0f] p-8">
            <Terminal size={22} className="text-purple-400 mb-4" />
            <h3 className="font-semibold text-white mb-2">Forum</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Threaded discussions across 10 security domains. Markdown support, code blocks, nested replies, and upvotes. Find answers or share what you know.
            </p>
          </div>
          <div className="bg-[#0a0a0f] p-8">
            <Users size={22} className="text-purple-400 mb-4" />
            <h3 className="font-semibold text-white mb-2">Real-time chat</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Themed rooms for live discussion. Share findings as they happen, coordinate on research, or just hang out with people who get it.
            </p>
          </div>
          <div className="bg-[#0a0a0f] p-8">
            <Shield size={22} className="text-purple-400 mb-4" />
            <h3 className="font-semibold text-white mb-2">Reputation system</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Earn reputation from quality posts and helpful comments. Your track record follows you — not your follower count.
            </p>
          </div>
          <div className="bg-[#0a0a0f] p-8">
            <Lock size={22} className="text-purple-400 mb-4" />
            <h3 className="font-semibold text-white mb-2">Properly moderated</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Active moderators, report tools, and transparent rules. This is a space for serious discussion — not a dumping ground.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Categories</h2>
            <p className="text-slate-500 text-sm mt-1">Pick your domain</p>
          </div>
          <Link href="/forum" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { name: "Exploits", icon: Bug, slug: "exploits" },
            { name: "Malware", icon: Shield, slug: "malware" },
            { name: "Crypto", icon: Lock, slug: "crypto" },
            { name: "OSINT", icon: Search, slug: "osint" },
            { name: "Web Sec", icon: Code2, slug: "websec" },
            { name: "Network", icon: Globe, slug: "network" },
            { name: "Tools", icon: Terminal, slug: "tools" },
            { name: "Tutorials", icon: MessageSquare, slug: "tutorials" },
            { name: "General", icon: Users, slug: "general" },
            { name: "Off-Topic", icon: Activity, slug: "offtopic" },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.slug} href={`/forum/${cat.slug}`}
                className="group border border-slate-800 rounded-lg p-4 hover:border-purple-700/50 hover:bg-purple-950/20 transition-all duration-200">
                <Icon size={18} className="text-slate-500 group-hover:text-purple-400 transition-colors mb-3" />
                <div className="text-sm font-medium text-white">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      {!session && (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="border border-slate-800 rounded-2xl p-12 text-center bg-gradient-to-b from-purple-950/30 to-transparent">
            <h2 className="text-3xl font-bold text-white mb-3">Join the community</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Free to join. No email verification loops. Just create an account and start posting.
            </p>
            <Link href="/register" className="inline-flex bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium px-8 py-3 rounded-lg items-center gap-2">
              Get Started <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
