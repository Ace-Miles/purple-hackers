"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Home, Users, Terminal, Shield, Menu, X, Bug, User as UserIcon, LogOut, Settings, MessageCircle, Wrench, Plus, BookOpen, Briefcase, ScrollText, Crown, BadgeCheck } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { BackButton } from "@/components/BackButton";

export function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dmCount, setDmCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [myRoleTag, setMyRoleTag] = useState<string>("");
  const [myVerified, setMyVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const poll = () => {
        fetch("/api/notifications/count").then(r => r.json()).then(d => setUnreadCount(d.count || 0)).catch(() => {});
        fetch("/api/dm/count").then(r => r.json()).then(d => setDmCount(d.count || 0)).catch(() => {});
      };
      poll();
      const interval = setInterval(poll, 15000);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile/me").then(r => r.json()).then(d => {
        setMyRoleTag(d.user?.roleTag || "");
        setMyVerified(d.user?.verified || false);
        // Apply theme
        if (d.user?.theme && typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", d.user.theme);
        }
      }).catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/forum", label: "Forum", icon: Terminal },
    { href: "/resources", label: "Resources", icon: BookOpen },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/rules", label: "Rules", icon: ScrollText },
  ];

  const isAdmin = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "MODERATOR" || (session?.user as any)?.role === "FOUNDER";
  const isFounder = (session?.user as any)?.role === "FOUNDER" || (session?.user as any)?.isFounder;

  return (
    <nav className={`sticky top-0 z-50 bg-[#0b0b16] border-b transition-all duration-300 ${scrolled ? "border-purple-500/20 shadow-lg shadow-purple-500/5" : "border-purple-500/5"}`}
      style={typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? { background: "rgba(255,255,255,0.95)", borderColor: "rgba(168,85,247,0.15)" } : {}}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 overflow-hidden">
        <BackButton />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0 group min-w-0">
          <span className="text-xl group-hover:scale-110 transition-transform shrink-0">💜</span>
          <span className="brand-font text-lg tracking-tight whitespace-nowrap">Purple Hackers</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 min-w-0">
          {navLinks.map(link => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${active ? "text-purple-400 bg-purple-500/10" : "text-slate-400 hover:text-purple-400 hover:bg-purple-500/5"}`}>
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${pathname?.startsWith("/admin") ? "text-red-400 bg-red-500/10" : "text-slate-400 hover:text-red-400 hover:bg-red-500/5"}`}>
              <Shield size={16} />
              Admin
            </Link>
          )}
        </div>

        {/* Right side — Chat moved here, plus notifications, avatar */}
        <div className="flex items-center gap-1 shrink-0">
          {status === "authenticated" ? (
            <>
              {/* Chat icon — moved to top right corner */}
              <button className="relative p-2 rounded-lg hover:bg-purple-500/10 transition-all" onClick={() => router.push("/chat")} title="Chat Rooms">
                <Users size={18} className="text-slate-400 hover:text-purple-400 transition-colors" />
              </button>

              {/* Messages icon */}
              <button className="relative p-2 rounded-lg hover:bg-purple-500/10 transition-all" onClick={() => router.push("/messages")} title="Messages">
                <MessageCircle size={18} className="text-slate-400 hover:text-purple-400 transition-colors" />
                {dmCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                    {dmCount > 9 ? "9+" : dmCount}
                  </span>
                )}
              </button>

              {/* Notification bug icon */}
              <button className="relative p-2 rounded-lg hover:bg-purple-500/10 transition-all" onClick={() => router.push("/notifications")} title="Notifications">
                <Bug size={18} className="text-slate-400 hover:text-purple-400 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-purple-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/40">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Settings icon - desktop only */}
              <button className="hidden md:flex p-2 rounded-lg hover:bg-purple-500/10 transition-all" onClick={() => router.push("/settings")} title="Settings">
                <Settings size={18} className="text-slate-400 hover:text-purple-400 transition-colors" />
              </button>

              {/* Avatar - desktop only */}
              <Link href={`/u/${(session?.user as any)?.username}`} className="hidden md:flex items-center gap-1.5 p-1 rounded-lg hover:bg-purple-500/10 transition-all">
                <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                  {(session?.user as any)?.avatar ? (
                    <img src={(session?.user as any).avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (session?.user as any)?.username?.slice(0, 2).toUpperCase() || "U"
                  )}
                </div>
                {myVerified && <BadgeCheck size={14} className="text-purple-400 shrink-0" />}
              </Link>

              {/* Sign out - desktop only */}
              <button className="hidden md:flex p-2 rounded-lg hover:bg-red-500/10 transition-all" onClick={() => { signOut(); router.push("/login"); }} title="Sign Out">
                <LogOut size={18} className="text-slate-400 hover:text-red-400 transition-colors" />
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login" className="btn-ghost">Sign In</Link>
              <Link href="/register" className="btn-purple">Join</Link>
            </div>
          ) : null}

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-purple-500/10 shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} className="text-slate-300" /> : <Menu size={20} className="text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0b0b16] border-t border-purple-500/10 px-4 py-3 space-y-1 fade-in"
          style={typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? { background: "rgba(255,255,255,0.95)" } : {}}>
          <Link href={`/u/${(session?.user as any)?.username}`} onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-purple-500/10 transition-all">
            <UserIcon size={18} /> Profile
          </Link>
          <Link href="/settings" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-purple-500/10 transition-all">
            <Settings size={18} /> Settings
          </Link>
          <Link href="/resources" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-purple-500/10 transition-all">
            <BookOpen size={18} /> Resources
          </Link>
          <Link href="/jobs" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-purple-500/10 transition-all">
            <Briefcase size={18} /> Jobs
          </Link>
          <Link href="/rules" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-purple-500/10 transition-all">
            <ScrollText size={18} /> Rules
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-500/10 transition-all">
              <Shield size={18} /> Admin Panel
            </Link>
          )}
          {status === "authenticated" && (
            <button onClick={() => { setMenuOpen(false); signOut(); router.push("/login"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut size={18} /> Sign Out
            </button>
          )}
          {status === "unauthenticated" && (
            <div className="flex gap-2 pt-2">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-ghost flex-1 text-center">Sign In</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="btn-purple flex-1 text-center">Join</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
