import { initializeHetznerControlRoomMachine } from "@/lib/services/machine-provisioning/hetzner-control-room";

export const runtime = "nodejs";

type InitMachineBody = {
  projectName?: string;
  serverType?: string;
  serverLocation?: string;
  serverImage?: string;
  runtimeAgent?: "hermes" | "openclaw" | "aeon";
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as InitMachineBody;
  const projectName = body.projectName?.trim();

  if (!projectName) {
    return Response.json({ ok: false, error: "Machine name is required." }, { status: 400 });
  }

  try {
    const result = await initializeHetznerControlRoomMachine({
      projectName,
      serverType: body.serverType,
      serverLocation: body.serverLocation,
      serverImage: body.serverImage,
      runtimeAgent: body.runtimeAgent,
    });
    return Response.json({ ok: true, machine: result });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not initialize machine project.",
    }, { status: 500 });
  }
}
