import { NextResponse } from "next/server";
import { verifyConnectivity } from "@/lib/neo4j";

export async function GET() {
  const connected = await verifyConnectivity();
  return NextResponse.json({ connected }, { status: connected ? 200 : 503 });
}
