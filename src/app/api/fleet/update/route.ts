import { spawn } from "child_process";
import { access } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const maxDuration = 360;

type UpdateBody = {
  collectorUrl?: string;
  dnsName?: string;
  name?: string;
  ip?: string;
  appDir?: string;
  updateCommand?: string;
  requiredCapabilities?: {
    chat?: boolean;
  };
};

type CollectorHealth = {
  ok?: boolean;
  capabilities?: {
    chat?: boolean;
    runtimes?: string[];
  };
  version?: {
    commit?: string;
    shortCommit?: string;
    dirty?: boolean;
  };
};

function collectorBase(collectorUrl?: string) {
  return collectorUrl?.replace(/\/+$/, "") || "";
}

async function fetchCollectorHealth(collectorUrl?: string): Promise<CollectorHealth | null> {
  const base = collectorBase(collectorUrl);
  if (!base) return null;
  const response = await fetch(`${base}/health`, {
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null) as Promise<CollectorHealth | null>;
}

function hasRequiredCapabilities(health: CollectorHealth | null, required?: UpdateBody["requiredCapabilities"]) {
  if (!required?.chat) return true;
  return health?.capabilities?.chat === true;
}

async function waitForCollectorVerification(collectorUrl?: string, required?: UpdateBody["requiredCapabilities"]) {
  const delays = [1_000, 2_000, 4_000, 8_000, 15_000];
  let health = await fetchCollectorHealth(collectorUrl);
  if (hasRequiredCapabilities(health, required)) return { verified: true, health };
  for (const delay of delays) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    health = await fetchCollectorHealth(collectorUrl);
    if (hasRequiredCapabilities(health, required)) return { verified: true, health };
  }
  return { verified: false, health };
}

async function startCollectorUpdate(collectorUrl?: string) {
  const base = collectorBase(collectorUrl);
  if (!base) throw new Error("No collector URL was provided.");
  const response = await fetch(`${base}/update`, {
    method: "POST",
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error ?? `collector update returned HTTP ${response.status}`);
  }
  return payload ?? { ok: true, accepted: true };
}

function shellSingleQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function updateScriptForCheckout() {
  return [
    "git pull --ff-only",
    "if ! command -v pnpm >/dev/null 2>&1 && command -v corepack >/dev/null 2>&1; then corepack enable; corepack prepare pnpm@latest --activate; fi",
    "pnpm install --frozen-lockfile",
    "AGENT_TELEMETRY_PORT=\"${AGENT_TELEMETRY_PORT:-8787}\" ./scripts/install-telemetry-collector.sh",
  ].join("\n");
}

function fallbackScript(appDir?: string) {
  if (appDir?.trim()) {
    return [
      "set -euo pipefail",
      `cd ${shellSingleQuote(appDir.trim())}`,
      updateScriptForCheckout(),
    ].join("\n");
  }
  const candidates = [
    "\"$HOME/hivemindos\"",
    "\"$HOME/openclaw-next\"",
    "/root/hivemindos",
    "/opt/hivemindos",
  ];
  return [
    "set -euo pipefail",
    "for d in " + candidates.join(" ") + "; do",
    "  if [ -d \"$d/.git\" ]; then",
    "    cd \"$d\"",
    "    break",
    "  fi",
    "done",
    "[ -d .git ] || { echo 'Could not find hivemindos checkout'; exit 2; }",
    updateScriptForCheckout(),
  ].join("\n");
}

function runProcess(command: string, args: string[], stdin: string | null, timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const detail = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n\n");
      reject(new Error(`${command} exited with code ${code}${detail ? `:\n${detail}` : ""}`));
    });

    child.stdin.end(stdin ?? "");
  });
}

function isUnknownHostKeyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /No .* host key is known|Host key verification failed|StrictHostKeyChecking/i.test(message);
}

function combineOutput(...parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join("\n\n");
}

async function runTailscaleSsh(target: string, script: string) {
  try {
    return await runProcess("tailscale", ["ssh", target, "bash", "-s"], script, 45_000);
  } catch (error) {
    if (!isUnknownHostKeyError(error)) throw error;
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n\nTailscale SSH is not enabled or trusted for this machine.`);
  }
}

function plainSshTargets(target: string) {
  if (target.includes("@")) return [target];
  const host = target.replace(/^[^@]+@/, "");
  return [target, `ubuntu@${host}`, `root@${host}`];
}

async function runPlainSsh(target: string, script: string) {
  const errors: string[] = [];
  for (const sshTarget of plainSshTargets(target)) {
    try {
      return await runProcess("ssh", [
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=8",
        "-o",
        "StrictHostKeyChecking=accept-new",
        sshTarget,
        "bash",
        "-s",
      ], script, 20_000);
    } catch (error) {
      errors.push(`${sshTarget}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join("\n\n"));
}

async function runRemoteShell(target: string, script: string) {
  let tailscaleError = "";
  try {
    return await runTailscaleSsh(target, script);
  } catch (error) {
    tailscaleError = error instanceof Error ? error.message : String(error);
  }

  try {
    const result = await runPlainSsh(target, script);
    return {
      ...result,
      stderr: combineOutput(`Tailscale SSH failed, plain SSH succeeded. Original Tailscale error:\n${tailscaleError}`, result.stderr),
    };
  } catch (error) {
    const plainSshError = error instanceof Error ? error.message : String(error);
    throw new Error(combineOutput(
      `Tailscale SSH failed:\n${tailscaleError}`,
      `Plain SSH failed:\n${plainSshError}`,
    ));
  }
}

async function tryTailscaleSsh(body: UpdateBody) {
  const target = body.dnsName || body.name || body.ip;
  if (!target) throw new Error("No Tailscale target was provided.");
  const script = fallbackScript(body.appDir);
  const { stdout, stderr } = await runRemoteShell(target, script);
  return { ok: true, accepted: true, method: "remote-shell", target, stdout, stderr, command: script };
}

async function isLocalCheckout(appDir?: string) {
  if (!appDir?.trim()) return false;
  try {
    await access(join(appDir.trim(), ".git"));
    await access(join(appDir.trim(), "setup.sh"));
    return true;
  } catch {
    return false;
  }
}

async function tryLocalShell(body: UpdateBody) {
  const script = fallbackScript(body.appDir);
  const { stdout, stderr } = await runProcess("bash", ["-s"], script, 300_000);
  return { ok: true, accepted: true, method: "local-shell", target: "this machine", stdout, stderr, command: script };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as UpdateBody;
  try {
    const result = await (await isLocalCheckout(body.appDir) ? tryLocalShell(body) : tryTailscaleSsh(body));
    const verification = await waitForCollectorVerification(body.collectorUrl, body.requiredCapabilities);
    if (!verification.verified) {
      return Response.json({
        ok: false,
        error: body.requiredCapabilities?.chat
          ? "The update command finished, but the collector still does not report the Hermes chat bridge."
          : "The update command finished, but collector verification did not pass.",
        method: result.method,
        stdout: result.stdout,
        stderr: result.stderr,
        health: verification.health,
        fallbackCommand: fallbackScript(body.appDir),
      }, { status: 502 });
    }
    return Response.json({ ...result, verified: true, health: verification.health });
  } catch (error) {
    const rawError = error instanceof Error ? error.message : "Update failed";
    if (body.collectorUrl) {
      try {
        const collectorResult = await startCollectorUpdate(body.collectorUrl);
        const verification = await waitForCollectorVerification(body.collectorUrl, body.requiredCapabilities);
        if (verification.verified) {
          return Response.json({
            ok: true,
            accepted: true,
            method: "collector-fallback",
            result: collectorResult,
            verified: true,
            health: verification.health,
            stderr: rawError,
          });
        }
        return Response.json({
          ok: false,
          error: "SSH is not available for this machine, so the collector fallback started the update, but verification did not pass before the timeout.",
          method: "collector-fallback",
          sshError: rawError,
          result: collectorResult,
          health: verification.health,
          fallbackCommand: fallbackScript(body.appDir),
        }, { status: 502 });
      } catch (collectorError) {
        return Response.json({
          ok: false,
          error: combineOutput(
            rawError,
            `Collector fallback failed:\n${collectorError instanceof Error ? collectorError.message : String(collectorError)}`,
          ),
          fallbackCommand: fallbackScript(body.appDir),
        }, { status: 502 });
      }
    }
    return Response.json({
      ok: false,
      error: rawError,
      fallbackCommand: fallbackScript(body.appDir),
    }, { status: 502 });
  }
}
