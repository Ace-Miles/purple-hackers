"use client";
import { useEffect, useState } from "react";
import { ScrollText, Loader2 } from "lucide-react";

export default function RulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rules").then(r => r.json()).then(d => {
      setRules(d.rules || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText size={24} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Community Rules</h1>
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-purple-500" /></div> : (
        <div className="space-y-3">
          {rules.map((r: any, i: number) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg purple-gradient flex items-center justify-center text-sm font-bold text-white shrink-0">{i + 1}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                  <p className="text-sm text-slate-400 mt-1 break-words">{r.description}</p>
                </div>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="card p-8 text-center text-slate-500 text-sm">
              Rules are being set up. Check back soon!
            </div>
          )}
        </div>
      )}

      <div className="card p-4 mt-6 border-purple-500/20">
        <h3 className="text-sm font-semibold text-purple-400 mb-2">⚠️ Reporting</h3>
        <p className="text-sm text-slate-400">If you see a post or comment that breaks these rules, use the report button (flag icon) on the post. Our moderators will review it.</p>
      </div>
    </div>
  );
}
