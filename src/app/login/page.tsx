"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Terminal, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid credentials or account banned");
      setLoading(false);
    } else {
      router.push("/forum");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl purple-gradient flex items-center justify-center mx-auto mb-4 purple-glow">
            <Terminal size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-purple-gradient">Welcome Back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to Purple Hackers</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input-dark pl-10" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="input-dark pl-10" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-purple w-full flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-3">
          <Link href="/reset-password" className="text-purple-400 hover:text-purple-300">Forgot password? Use recovery token</Link>
        </p>

        <p className="text-center text-sm text-slate-400 mt-4">
          No account? <Link href="/register" className="text-purple-400 hover:text-purple-300 font-semibold">Join the community</Link>
        </p>
      </div>
    </div>
  );
}
