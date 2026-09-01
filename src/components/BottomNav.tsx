"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Wrench, Plus, Gift, User as UserIcon } from "lucide-react";

export function BottomNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Hide on auth pages
  if (pathname === "/login" || pathname === "/register") return null;

  // Hide bottom nav in chat and DM pages so the input bar can sit at the bottom properly
  const isChatPage = pathname?.startsWith("/chat") || pathname?.startsWith("/messages");
  if (isChatPage) return null;

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

      <Link href="/tools" onClick={(e) => guardedNav("/tools", e)} className={`bottom-nav-item ${isActive("/tools") ? "active" : ""}`}>
        <Wrench size={22} strokeWidth={isActive("/tools") ? 2.5 : 2} />
      </Link>

      <Link
        href={status === "authenticated" ? "/forum/new" : "/login"}
        className="bottom-nav-item -mt-3"
      >
        <div className="w-11 h-11 rounded-2xl purple-gradient flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Plus size={22} className="text-white" strokeWidth={2.5} />
        </div>
      </Link>

      <Link href="/referrals" onClick={(e) => guardedNav("/referrals", e)} className={`bottom-nav-item ${isActive("/referrals") ? "active" : ""}`}>
        <Gift size={22} strokeWidth={isActive("/referrals") ? 2.5 : 2} />
      </Link>

      {/* Profile */}
      <Link
        href={status === "authenticated" ? `/u/${(session?.user as any)?.username || ""}` : "/login"}
        onClick={(e) => guardedNav("/u", e)}
        className={`bottom-nav-item ${isActive("/u") ? "active" : ""}`}
      >
        {session && (session?.user as any)?.avatar ? (
          <img src={(session?.user as any).avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <UserIcon size={22} strokeWidth={isActive("/u") ? 2.5 : 2} />
        )}
      </Link>
    </nav>
  );
}
