import { NextResponse } from "next/server";
import { Pool } from "pg";

export const maxDuration = 15;

export async function GET() {
  const conn = "postgresql://postgres.bhskhsocmjzahqfvfoml:08030789462Jj.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  
  try {
    const pool = new Pool({ 
      connectionString: conn, 
      connectionTimeoutMillis: 8000,
      ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();
    
    // List all tables
    const tables = await client.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name
    `);
    
    // Also try to create a test table for Purple Hackers
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS purple_hackers
    `);
    
    client.release();
    await pool.end();
    return NextResponse.json({ success: true, tables: tables.rows, schemaCreated: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message?.slice(0, 300) });
  }
}
