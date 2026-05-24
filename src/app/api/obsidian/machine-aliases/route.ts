import { NextRequest } from "next/server";

import { readMachineAliases, writeMachineAlias } from "@/lib/services/obsidian/machine-aliases";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const vaultPath = request.nextUrl.searchParams.get("vaultPath") ?? undefined;
    const result = await readMachineAliases(vaultPath);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read machine aliases.",
    }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      vaultPath?: string;
      machineKey?: string;
      name?: string;
    };
    const result = await writeMachineAlias({
      vaultPath: body.vaultPath,
      machineKey: body.machineKey ?? "",
      name: body.name ?? "",
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not write machine alias.",
    }, { status: 400 });
  }
}
