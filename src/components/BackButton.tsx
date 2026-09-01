"use client";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Mobile-only back button styled like Acemiles OS.
 * A < arrow that pushes adjacent content right when visible, retracts when not needed.
 */
export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if there's history to go back to
    setCanGoBack(window.history.length > 1);
    // Show back button on sub-pages (not on root pages)
    const rootPaths = ["/forum", "/chat", "/tools", "/messages", "/", "/login", "/register", "/notifications", "/settings"];
    const isRoot = rootPaths.some(p => pathname === p);
    const isSubPage = !isRoot;
    setShow(isSubPage);
  }, [pathname]);

  if (!show || !canGoBack) return null;

  return (
    <button
      onClick={() => router.back()}
      className={`md:hidden back-arrow-btn shrink-0 flex items-center justify-center p-1.5 rounded-lg hover:bg-purple-500/10 transition-all ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft size={20} className="text-purple-400" strokeWidth={2.5} />
    </button>
  );
}
