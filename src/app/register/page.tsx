"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Terminal, Mail, Lock, User, Loader2, AlertCircle, Eye, EyeOff, Gift, KeyRound, Copy, Check } from "lucide-react";

function RegisterContent() {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", referral: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setForm(f => ({ ...f, referral: ref }));
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const copyToken = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          referralCode: form.referral || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Show the reset token if returned
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }

      // Auto login
      const signInRes = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (signInRes?.error) {
        setError("Account created! Please sign in.");
        setLoading(false);
        router.push("/login");
      } else {
        router.push("/forum");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl purple-gradient flex items-center justify-center mx-auto mb-4 purple-glow">
            <Terminal size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-purple-gradient">Join Purple Hackers</h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        {/* Password reset token display */}
        {resetToken && (
          <div className="card p-5 mb-4 border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound size={18} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white">Save Your Password Reset Token</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Keep this token safe! If you ever forget your password, you can use it to recover your account.
              You can also find it later in the menu → Reset Password.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-slate-800/80 border border-purple-500/20 text-purple-300 text-xs font-mono break-all">
                {resetToken}
              </code>
              <button onClick={copyToken} className="btn-purple shrink-0 flex items-center gap-1.5">
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="username" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+"
                value={form.username} onChange={handleChange} className="input-dark pl-10"
                placeholder="h4ck3r_name" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="email" type="email" required value={form.email} onChange={handleChange}
                className="input-dark pl-10" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="password" type={showPwd ? "text" : "password"} required minLength={6} value={form.password} onChange={handleChange}
                className="input-dark pl-10 pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="confirm" type={showConfirm ? "text" : "password"} required value={form.confirm} onChange={handleChange}
                className="input-dark pl-10 pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Referral Code (optional)</label>
            <div className="relative">
              <Gift size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="referral" value={form.referral} onChange={handleChange}
                className="input-dark pl-10" placeholder="PH-USERNAME-XXXX" />
            </div>
            {form.referral && (
              <p className="text-xs text-purple-400 mt-1">💜 You'll boost your referrer's stats!</p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-purple w-full flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          Already have an account? <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
