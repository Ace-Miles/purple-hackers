"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Hash, Users, Lock, Megaphone, Loader2, Plus, Bug, Search, LifeBuoy } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const ROOM_ICONS: Record<string, any> = { Hash: Hash, Bug: Bug, Lock: Lock, Search: Search, LifeBuoy: LifeBuoy, Megaphone: Megaphone, Users: Users };

export default function Chat() {
  const { status } = useSession();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    fetch("/api/chat/rooms").then(r => r.json()).then(d => {
      setRooms(d.rooms || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-gradient">Chat Rooms</h1>
          <p className="text-sm text-slate-400">Real-time discussions</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {rooms.map((room: any) => {
          const Icon = ROOM_ICONS[room.icon] || Hash;
          return (
            <Link key={room.id} href={`/chat/${room.id}`}
              className="card p-4 glass-hover transition-all flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${room.type === "ANNOUNCEMENT" ? "bg-red-500/10" : "bg-purple-500/10"}`}>
                <Icon size={20} className={room.type === "ANNOUNCEMENT" ? "text-red-400" : "text-purple-400"} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm">{room.name}</div>
                <div className="text-xs text-slate-500">{room.description}</div>
                <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                  <Users size={10} /> {room.memberCount} members
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
