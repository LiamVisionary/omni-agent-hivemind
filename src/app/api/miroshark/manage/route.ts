import { getMiroSharkCompanionStatus, startMiroSharkSetup } from "@/lib/services/miroshark/companion-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { action?: "install" | "start" } | null;
  const action = body?.action;

  if (action !== "install" && action !== "start") {
    return Response.json({ ok: false, error: "Unsupported MiroShark action" }, { status: 400 });
  }

  startMiroSharkSetup(action);
  return Response.json(await getMiroSharkCompanionStatus());
}
