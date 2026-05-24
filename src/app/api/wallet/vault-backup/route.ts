import { NextRequest, NextResponse } from "next/server";

import {
  getWalletVaultBackupStatus,
  refreshWalletVaultBackup,
  restoreWalletVaultBackup,
} from "@/lib/services/wallet/wallet-vault-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const vaultPath = request.nextUrl.searchParams.get("vaultPath") ?? undefined;
    const status = await getWalletVaultBackupStatus(vaultPath);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read wallet vault backup status.",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { action?: string; vaultPath?: string };
    if (body.action === "refresh") {
      const status = await refreshWalletVaultBackup(body.vaultPath);
      return NextResponse.json({ ok: true, status });
    }
    if (body.action === "restore") {
      const status = await restoreWalletVaultBackup(body.vaultPath);
      return NextResponse.json({ ok: true, status });
    }
    return NextResponse.json({ ok: false, error: "Unsupported wallet vault backup action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Wallet vault backup action failed.",
    }, { status: 500 });
  }
}
