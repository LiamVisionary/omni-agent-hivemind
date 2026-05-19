import { NextRequest, NextResponse } from "next/server";
import { generateWallet } from "@/lib/services/wallet/chain-wallet";
import { storeWalletSecret } from "@/lib/services/wallet/local-wallet-vault";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      agentId?: string;
      network?: string;
    };
    const agentId = body.agentId?.trim();
    if (!agentId) return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 });
    const wallet = generateWallet(body.network || "eip155:8453");
    const info = await storeWalletSecret({ agentId, address: wallet.address, network: wallet.network, secret: wallet.secret });
    return NextResponse.json({ ok: true, wallet: info });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to create wallet" }, { status: 500 });
  }
}
