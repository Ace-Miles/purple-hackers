"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Users, Plus, Wrench, MessageCircle } from "lucide-react";

export function BottomNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [dmCount, setDmCount] = useState(0);

  useEffect(() => {
    if (status === "authenticated") {
      const poll = () => {
        fetch("/api/dm/count").then(r => r.json()).then(d => setDmCount(d.count || 0)).catch(() => {});
      };
      poll();
      const interval = setInterval(poll, 15000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Hide on auth pages
  if (pathname === "/login" || pathname === "/register") return null;

  const guardedNav = (href: string, e: React.MouseEvent) => {
    if (status !== "authenticated") {
      e.preventDefault();
      router.push("/login");
    }
  };

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <nav className="bottom-nav md:hidden">
      <Link href="/forum" className={`bottom-nav-item ${isActive("/forum") && !pathname?.startsWith("/forum/new") ? "active" : ""}`}>
        <Home size={22} strokeWidth={isActive("/forum") ? 2.5 : 2} />
      </Link>

      <Link href="/chat" onClick={(e) => guardedNav("/chat", e)} className={`bottom-nav-item ${isActive("/chat") ? "active" : ""}`}>
        <Users size={22} strokeWidth={isActive("/chat") ? 2.5 : 2} />
      </Link>

      <Link
        href={status === "authenticated" ? "/forum/new" : "/login"}
        className="bottom-nav-item -mt-3"
      >
        <div className="w-11 h-11 rounded-2xl purple-gradient flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Plus size={22} className="text-white" strokeWidth={2.5} />
        </div>
      </Link>

      <Link href="/tools" className={`bottom-nav-item ${isActive("/tools") ? "active" : ""}`}>
        <Wrench size={22} strokeWidth={isActive("/tools") ? 2.5 : 2} />
      </Link>

      <Link href="/messages" onClick={(e) => guardedNav("/messages", e)} className={`bottom-nav-item relative ${isActive("/messages") ? "active" : ""}`}>
        <MessageCircle size={22} strokeWidth={isActive("/messages") ? 2.5 : 2} />
        {dmCount > 0 && (
          <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
            {dmCount > 9 ? "9+" : dmCount}
          </span>
        )}
      </Link>
    </nav>
  );
}
