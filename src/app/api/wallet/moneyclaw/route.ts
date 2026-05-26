import { NextRequest, NextResponse } from "next/server";
import { getMoneyClawStatus } from "@/lib/services/wallet/moneyclaw-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = await getMoneyClawStatus({
      apiKeyEnvName: searchParams.get("envName") || undefined,
      baseUrl: searchParams.get("baseUrl") || undefined,
    });
    const httpStatus = status.configured ? 200 : 400;
    return NextResponse.json({ ok: status.configured, status }, { status: httpStatus });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to read MoneyClaw status" },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      apiKey?: string;
      envName?: string;
      baseUrl?: string;
    };
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey.startsWith("mcl_")) {
      return NextResponse.json({ ok: false, error: "MoneyClaw keys should start with mcl_." }, { status: 400 });
    }
    const status = await getMoneyClawStatus({
      apiKey,
      apiKeyEnvName: body.envName || undefined,
      baseUrl: body.baseUrl || undefined,
    });
    const hasUsableRead = Boolean(status.account || status.balance || status.depositAddress || status.paymentIntents);
    if (!hasUsableRead) {
      const firstError = Object.values(status.errors)[0] || "MoneyClaw rejected this key.";
      return NextResponse.json({ ok: false, status, error: firstError }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to validate MoneyClaw key" },
      { status: 400 },
    );
  }
}
