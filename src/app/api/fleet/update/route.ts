import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type UpdateBody = {
  collectorUrl?: string;
  dnsName?: string;
  name?: string;
  ip?: string;
  appDir?: string;
  updateCommand?: string;
};

async function tryCollectorUpdate(collectorUrl?: string) {
  if (!collectorUrl) return null;
  const response = await fetch(`${collectorUrl.replace(/\/+$/, "")}/update`, {
    method: "POST",
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => ({ ok: true, accepted: true }));
}

function shellSingleQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function fallbackCommand(appDir?: string, updateCommand?: string) {
  if (updateCommand?.trim()) return updateCommand.trim();
  if (appDir?.trim()) return `cd ${shellSingleQuote(appDir.trim())} && git pull --ff-only && ./setup.sh`;
  const candidates = [
    "\"$HOME/omni-agent-hivemind\"",
    "\"$HOME/openclaw-next\"",
    "/root/omni-agent-hivemind",
    "/opt/omni-agent-hivemind",
  ];
  return [
    "set -e",
    `for d in ${candidates.join(" ")}; do if [ -d "$d/.git" ]; then cd "$d"; break; fi; done`,
    "[ -d .git ] || { echo 'Could not find omni-agent-hivemind checkout'; exit 2; }",
    "git pull --ff-only",
    "./setup.sh",
  ].join("; ");
}

async function tryTailscaleSsh(body: UpdateBody) {
  const target = body.dnsName || body.name || body.ip;
  if (!target) throw new Error("No Tailscale target was provided.");
  const command = fallbackCommand(body.appDir, body.updateCommand);
  const { stdout, stderr } = await execFileAsync("tailscale", ["ssh", target, "bash", "-lc", command], {
    timeout: 180_000,
    maxBuffer: 1_500_000,
  });
  return { ok: true, accepted: true, method: "tailscale-ssh", target, stdout, stderr, command };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as UpdateBody;
  const collectorResult = await tryCollectorUpdate(body.collectorUrl);
  if (collectorResult) {
    return Response.json({ ok: true, method: "collector", result: collectorResult });
  }

  try {
    const result = await tryTailscaleSsh(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
      fallbackCommand: fallbackCommand(body.appDir, body.updateCommand),
    }, { status: 502 });
  }
}
