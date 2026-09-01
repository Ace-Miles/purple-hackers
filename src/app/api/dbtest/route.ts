import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get("region") || "us-east-1";
  
  const poolerUrl = `postgresql://postgres.cndtinbeatseufbyursh:08030789462Jj.@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;
  
  try {
    const prisma = new PrismaClient({ datasources: { db: { url: poolerUrl } } });
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    await prisma.$disconnect();
    return NextResponse.json({ success: true, region, message: "Connected!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, region, error: error.message?.slice(0, 200) }, { status: 200 });
  }
}
