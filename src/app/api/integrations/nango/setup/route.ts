import { setupNangoHost } from "@/lib/services/integrations/nango-host";

export const runtime = "nodejs";
export const maxDuration = 360;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    const result = await setupNangoHost(body);
    return Response.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not set up Nango on the selected host.",
    }, { status: 502 });
  }
}
