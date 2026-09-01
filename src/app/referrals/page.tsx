"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Copy, Check, Users, Trophy, Sparkles, ExternalLink } from "lucide-react";

export default function ReferralsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/referrals").then(r => r.json()).then(d => {
        setData(d);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [status, router]);

  if (loading || status === "loading") return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;
  if (!session) return null;

  const referralCode = data?.referralCode || "";
  const referralCount = data?.referralCount || 0;
  const referrals = data?.referrals || [];
  const referrer = data?.referrer || null;
  const hasPurpleOG = data?.hasPurpleOG || data?.hasPurpleBadge || false;
  const inviteLink = `https://purple-hackers.vercel.app/register?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const progressToOG = Math.min(100, (referralCount / 5) * 100);
  const pastGoal = referralCount > 5;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Gift size={24} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
      </div>

      {/* Purple O.G badge progress */}
      <div className="card p-5 mb-6 border-purple-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasPurpleOG ? "purple-gradient" : "bg-slate-800"}`}>
            <Trophy size={24} className={hasPurpleOG ? "text-white" : "text-slate-600"} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">💜 Purple O.G Badge</h3>
            <p className="text-xs text-slate-500">Refer 5 members to unlock this exclusive badge</p>
          </div>
          {hasPurpleOG && <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs">{pastGoal ? `+${referralCount - 5} BONUS` : "UNLOCKED"}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full purple-gradient transition-all duration-500" style={{ width: `${progressToOG}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-400">{referralCount}/5</span>
        </div>
      </div>

      {/* Invite link */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Your Invite Link</h3>
        <p className="text-xs text-slate-500 mb-3">Share this link. When someone joins, you get +10 reputation.</p>
        <div className="flex items-center gap-2">
          <input type="text" readOnly value={inviteLink}
            className="input-dark flex-1 text-xs font-mono" />
          <button onClick={copyLink} className="btn-purple flex items-center gap-1.5 shrink-0">
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <code className="text-xs text-slate-500">Code: {referralCode}</code>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4 text-center">
          <Users size={20} className="text-purple-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">{referralCount}</div>
          <div className="text-xs text-slate-500">People Referred</div>
        </div>
        <div className="card p-4 text-center">
          <Sparkles size={20} className="text-amber-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">+{referralCount * 10}</div>
          <div className="text-xs text-slate-500">Reputation Earned</div>
        </div>
      </div>

      {/* Who referred me */}
      {referrer && (
        <div className="card p-4 mb-6">
          <h3 className="text-xs text-slate-500 mb-2">You were referred by</h3>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
              {referrer.avatar ? <img src={referrer.avatar} alt="" className="w-full h-full object-cover" /> : referrer.username.slice(0, 2).toUpperCase()}
            </div>
            <a href={`/u/${referrer.username}`} className="text-sm font-medium text-purple-400 hover:text-purple-300">{referrer.username}</a>
          </div>
        </div>
      )}

      {/* Referred users list */}
      <h3 className="text-sm font-semibold text-white mb-3">Your Referrals</h3>
      {referrals.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          <Gift size={32} className="mx-auto mb-2 text-slate-700" />
          No referrals yet. Share your invite link to get started!
        </div>
      ) : (
        <div className="space-y-2">
          {referrals.map((r: any) => (
            <div key={r.id} className="card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                {r.referred?.avatar ? <img src={r.referred.avatar} alt="" className="w-full h-full object-cover" /> : r.referred?.username?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <a href={`/u/${r.referred?.username}`} className="text-sm font-medium text-purple-400 hover:text-purple-300 truncate">{r.referred?.username}</a>
                <p className="text-xs text-slate-500">Joined {new Date(r.referred?.joinedAt || r.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xs text-green-400 shrink-0">+10 rep</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
