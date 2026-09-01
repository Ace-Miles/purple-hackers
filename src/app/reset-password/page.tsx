"use client";
import { useState } from "react";
import Link from "next/link";
import { Terminal, Mail, Lock, KeyRound, Loader2, AlertCircle, Eye, EyeOff, Check } from "lucide-react";

export default function ResetPassword() {
  const [form, setForm] = useState({ email: "", token: "", newPassword: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (form.newPassword !== form.confirm) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          token: form.token,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed");
        setLoading(false);
        return;
      }
      setSuccess(true);
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
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-purple-gradient">Reset Password</h1>
          <p className="text-slate-400 text-sm mt-1">Use your recovery token</p>
        </div>

        {success ? (
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Password Reset!</h3>
            <p className="text-sm text-slate-400 mb-4">Your password has been updated successfully.</p>
            <Link href="/login" className="btn-purple inline-flex items-center gap-2">
              Sign In
            </Link>
          </div>
        ) : (
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
                <input name="email" type="email" required value={form.email} onChange={handleChange}
                  className="input-dark pl-10" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Recovery Token</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input name="token" required value={form.token} onChange={handleChange}
                  className="input-dark pl-10 font-mono text-xs" placeholder="YOUR RESET TOKEN" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input name="newPassword" type={showPwd ? "text" : "password"} required minLength={6}
                  value={form.newPassword} onChange={handleChange}
                  className="input-dark pl-10 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Confirm New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input name="confirm" type={showPwd ? "text" : "password"} required
                  value={form.confirm} onChange={handleChange}
                  className="input-dark pl-10" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-purple w-full flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Resetting...</> : "Reset Password"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-400 mt-4">
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
