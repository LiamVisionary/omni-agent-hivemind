import { getMiroSharkCompanionStatus } from "@/lib/services/miroshark/companion-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIROSHARK_STATUS_CACHE_MS = 20_000;
const MIROSHARK_RUNNING_STATUS_CACHE_MS = 2_500;

let cachedStatus: {
  checkedAt: number;
  payload: Awaited<ReturnType<typeof getMiroSharkCompanionStatus>>;
} | null = null;
let inFlightStatus: ReturnType<typeof getMiroSharkCompanionStatus> | null = null;

export async function GET() {
  const now = Date.now();
  const cacheMs = cachedStatus?.payload.install.running ? MIROSHARK_RUNNING_STATUS_CACHE_MS : MIROSHARK_STATUS_CACHE_MS;
  if (cachedStatus && now - cachedStatus.checkedAt < cacheMs) {
    return Response.json(cachedStatus.payload);
  }

  inFlightStatus ??= getMiroSharkCompanionStatus()
    .then((payload) => {
      cachedStatus = { checkedAt: Date.now(), payload };
      return payload;
    })
    .finally(() => {
      inFlightStatus = null;
    });

  return Response.json(await inFlightStatus);
}
