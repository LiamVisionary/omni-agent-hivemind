import { readNangoIntegrationPayload, updateNangoHostConfig } from "@/lib/services/integrations/nango-host";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await readNangoIntegrationPayload());
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read Nango integration status.",
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    return Response.json(await updateNangoHostConfig(body));
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not update Nango integration host.",
    }, { status: 500 });
  }
}
