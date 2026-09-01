"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertCircle, Check, Camera, Trash2, ShieldAlert } from "lucide-react";

export default function Settings() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({ bio: "", title: "", github: "", website: "", location: "", avatar: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session) {
      fetch("/api/profile/me").then(r => r.json()).then(d => {
        if (d.user) {
          setForm({ bio: d.user.bio || "", title: d.user.title || "", github: d.user.github || "", website: d.user.website || "", location: d.user.location || "", avatar: d.user.avatar || "" });
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [status, session, router]);

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "avatar");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) {
        setForm(prev => ({ ...prev, avatar: d.url }));
        await fetch("/api/profile/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: d.url }) });
      } else {
        setError(d.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    }
    setUploadingAvatar(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError("Failed to save"); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError("Something went wrong"); }
    setSaving(false);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const d = await res.json();
      if (!res.ok) { setDeleteError(d.error || "Failed to delete account"); setDeleting(false); return; }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Something went wrong");
      setDeleting(false);
    }
  };

  if (loading || status === "loading") return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;
  if (!session) return null;

  const username = (session.user as any)?.username || "U";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-purple-gradient mb-6">Settings</h1>

      <form onSubmit={handleSave} className="card p-6 space-y-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words"><AlertCircle size={16} className="shrink-0" /> {error}</div>}
        {success && <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm"><Check size={16} /> Saved successfully</div>}

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-2xl bg-purple-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden">
            {form.avatar ? <img src={form.avatar} alt="" className="w-full h-full object-cover" /> : username.slice(0, 2).toUpperCase()}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
              className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploadingAvatar ? <Loader2 size={20} className="animate-spin text-white" /> : <Camera size={20} className="text-white" />}
            </button>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={e => handleAvatarUpload(e.target.files?.[0])} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="btn-ghost text-xs">
              {uploadingAvatar ? "Uploading..." : "Change Avatar"}
            </button>
            <p className="text-[11px] text-slate-500 mt-1">PNG, JPG or GIF</p>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Bio</label>
          <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="input-dark min-h-[80px] resize-y" placeholder="Tell us about yourself..." maxLength={500} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Custom Title</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="e.g. Script Kiddie, Exploit Writer..." maxLength={50} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">GitHub Username</label>
          <input type="text" value={form.github} onChange={e => setForm({ ...form, github: e.target.value })} className="input-dark" placeholder="your-github-username" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Website</label>
          <input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className="input-dark" placeholder="https://yoursite.com" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Location</label>
          <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-dark" placeholder="Earth" />
        </div>
        <button type="submit" disabled={saving} className="btn-purple flex items-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="card p-6 mt-6 border-red-500/20">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={18} className="text-red-400" />
          <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Deleting your account is permanent. Your posts, comments, messages, and profile will be removed. This cannot be undone.
        </p>
        {deleteError && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-3 break-words"><AlertCircle size={16} className="shrink-0" /> {deleteError}</div>}
        <label className="text-xs text-slate-400 mb-1.5 block">Type <span className="font-mono text-red-400">DELETE</span> to confirm</label>
        <div className="flex gap-2">
          <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
            className="input-dark flex-1" placeholder="DELETE" />
          <button type="button" onClick={deleteAccount} disabled={deleteConfirm !== "DELETE" || deleting}
            className="px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-all shrink-0">
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
