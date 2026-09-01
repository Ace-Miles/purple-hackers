import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "purple-hackers-media";

const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || "post";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // If Supabase not configured, store as base64 data URL (works for avatars & small images)
    const useBase64 = !SUPABASE_URL || !SUPABASE_SECRET;

    if (useBase64) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only images supported in this mode" }, { status: 400 });
      }
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Image too large (max 2MB). Try a smaller image." }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const dataUrl = "data:" + file.type + ";base64," + base64;
      return NextResponse.json({ url: dataUrl, type: file.type });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const ext = file.name.split(".").pop() || "bin";
    const path = kind + "/" + userId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadRes = await fetch(SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + SUPABASE_SECRET,
        apikey: SUPABASE_SECRET,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json({ error: "Upload failed", detail: errText.slice(0, 300) }, { status: 500 });
    }

    const publicUrl = SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/" + path;

    return NextResponse.json({ url: publicUrl, type: file.type });
  } catch (error: any) {
    return NextResponse.json({ error: "Upload failed", detail: error.message?.slice(0, 300) }, { status: 500 });
  }
}
