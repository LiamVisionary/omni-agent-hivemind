import { NextRequest, NextResponse } from "next/server";
import { sendUsdc } from "@/lib/services/wallet/chain-wallet";
import { getWalletSecret } from "@/lib/services/wallet/local-wallet-vault";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      agentId?: string;
      toAddress?: string;
      amountUsd?: number;
      maxPaymentUsd?: number;
      confirmation?: string;
    };
    const agentId = body.agentId?.trim();
    const toAddress = body.toAddress?.trim();
    const amountUsd = Number(body.amountUsd);
    if (!agentId) return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 });
    if (!toAddress) return NextResponse.json({ ok: false, error: "Recipient address is required" }, { status: 400 });
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return NextResponse.json({ ok: false, error: "Amount must be greater than zero" }, { status: 400 });
    if (body.maxPaymentUsd != null && amountUsd > Number(body.maxPaymentUsd)) {
      return NextResponse.json({ ok: false, error: `Amount exceeds this agent's per-payment cap ($${Number(body.maxPaymentUsd).toFixed(2)})` }, { status: 400 });
    }
    if (body.confirmation !== "SEND_USDC") {
      return NextResponse.json({ ok: false, error: "Type SEND_USDC to confirm this money-moving action." }, { status: 400 });
    }
    const stored = await getWalletSecret(agentId);
    if (!stored) return NextResponse.json({ ok: false, error: "No local wallet exists for this agent." }, { status: 404 });
    const result = await sendUsdc({
      network: stored.info.network,
      secret: stored.secret,
      fromAddress: stored.info.address,
      toAddress,
      amountUsd,
    });
    return NextResponse.json({ ok: true, signature: result.signature, network: stored.info.network });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to send USDC" }, { status: 500 });
  }
}
