import { NextResponse } from "next/server";
import { Pool } from "pg";

export const maxDuration = 30;

export async function GET() {
  const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;

  try {
    const pool = new Pool({
      connectionString: conn,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });
    const client = await pool.connect();

    const results: string[] = [];

    // Create/update bucket
    try {
      await client.query(`INSERT INTO storage.buckets (id, name, public) VALUES ('purple-hackers-media', 'purple-hackers-media', true) ON CONFLICT (id) DO UPDATE SET public = true`);
      results.push("Bucket created/updated (public)");
    } catch (e: any) {
      results.push("Bucket: " + (e.message || "").slice(0, 80));
    }

    // Drop and recreate policies (avoids IF NOT EXISTS syntax issues)
    const policies = [
      { name: "ph_storage_read", sql: "SELECT", check: "bucket_id = 'purple-hackers-media'" },
      { name: "ph_storage_insert", sql: "INSERT", check: "bucket_id = 'purple-hackers-media'" },
      { name: "ph_storage_update", sql: "UPDATE", check: "bucket_id = 'purple-hackers-media'" },
      { name: "ph_storage_delete", sql: "DELETE", check: "bucket_id = 'purple-hackers-media'" },
    ];

    for (const p of policies) {
      try {
        await client.query("DROP POLICY IF EXISTS " + JSON.stringify(p.name) + " ON storage.objects");
        await client.query("CREATE POLICY " + JSON.stringify(p.name) + " ON storage.objects FOR " + p.sql + " USING (" + p.check + ") WITH CHECK (" + p.check + ")");
        results.push("Policy: " + p.name + " created");
      } catch (e: any) {
        results.push("Policy " + p.name + ": " + (e.message || "").slice(0, 60));
      }
    }

    // Verify
    const bucketCheck = await client.query("SELECT id, name, public FROM storage.buckets WHERE id = 'purple-hackers-media'");
    results.push("Bucket: " + JSON.stringify(bucketCheck.rows[0]));

    client.release();
    await pool.end();

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message?.slice(0, 500) }, { status: 500 });
  }
}
