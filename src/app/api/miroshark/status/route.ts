import { getMiroSharkCompanionStatus } from "@/lib/services/miroshark/companion-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getMiroSharkCompanionStatus());
}
