import type { NextRequest } from "next/server";

export async function applyUserRateLimit(_request: NextRequest, _userId: string) {
  return {
    isDenied: () => false,
  };
}
