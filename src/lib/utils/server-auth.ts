import type { NextRequest } from "next/server";

export async function verifyAuth(_request: NextRequest): Promise<{ userId: string | null }> {
  return { userId: process.env.OPENCLAW_NEXT_USER_ID ?? "local-user" };
}
