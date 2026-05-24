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
  expectedCommit?: string;
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
    latestCommit?: string;
    latestShortCommit?: string;
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

function hasExpectedVersion(health: CollectorHealth | null, expectedCommit?: string) {
  const expected = expectedCommit?.trim();
  const commit = health?.version?.commit?.trim();
  const latest = health?.version?.latestCommit?.trim();
  if (commit && latest && commit === latest) return true;
  if (!expected) return true;
  return commit === expected;
}

function hasVerificationTarget(body: UpdateBody) {
  return Boolean(body.expectedCommit?.trim() || body.requiredCapabilities?.chat);
}

async function updateBodyWithTarget(body: UpdateBody): Promise<UpdateBody> {
  if (body.expectedCommit?.trim()) return body;
  const health = await fetchCollectorHealth(body.collectorUrl);
  const commit = health?.version?.commit?.trim();
  const latestCommit = health?.version?.latestCommit?.trim();
  if (commit && latestCommit && commit !== latestCommit) {
    return { ...body, expectedCommit: latestCommit };
  }
  return body;
}

function verificationError(body: UpdateBody, health: CollectorHealth | null) {
  if (body.expectedCommit?.trim() && health?.version?.commit !== body.expectedCommit.trim()) {
    const current = health?.version?.shortCommit || health?.version?.commit?.slice(0, 7) || "unknown";
    const expected = health?.version?.latestShortCommit || body.expectedCommit.trim().slice(0, 7);
    return `The update started, but this collector still reports ${current} instead of ${expected}. It may still be building, or the remote update failed.`;
  }
  if (body.requiredCapabilities?.chat) return "The update command finished, but the collector still does not report the Hermes chat bridge.";
  if (!body.expectedCommit?.trim()) return "The update request did not include or expose a target commit to verify.";
  return "The update command finished, but collector verification did not pass.";
}

async function waitForCollectorVerification(body: UpdateBody) {
  const delays = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000, 45_000, 60_000, 60_000, 60_000];
  let health = await fetchCollectorHealth(body.collectorUrl);
  if (!hasVerificationTarget(body)) return { verified: false, health };
  if (hasVerificationTarget(body) && hasRequiredCapabilities(health, body.requiredCapabilities) && hasExpectedVersion(health, body.expectedCommit)) {
    return { verified: true, health };
  }
  for (const delay of delays) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    health = await fetchCollectorHealth(body.collectorUrl);
    if (hasVerificationTarget(body) && hasRequiredCapabilities(health, body.requiredCapabilities) && hasExpectedVersion(health, body.expectedCommit)) {
      return { verified: true, health };
    }
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

async function tryCollectorUpdate(body: UpdateBody) {
  const result = await startCollectorUpdate(body.collectorUrl);
  return { ok: true, accepted: true, method: "collector", result };
}

function shellSingleQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function installScriptForCheckout() {
  return [
    "if ! command -v pnpm >/dev/null 2>&1 && command -v corepack >/dev/null 2>&1; then corepack enable; corepack prepare pnpm@latest --activate; fi",
    "pnpm install --frozen-lockfile",
    "AGENT_TELEMETRY_PORT=\"${AGENT_TELEMETRY_PORT:-8787}\" ./scripts/install-telemetry-collector.sh",
  ].join("\n");
}

function remoteUpdateScript() {
  return [
    "repo_url=$(git remote get-url origin)",
    "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)",
    "if ! git pull --ff-only; then",
    "  status=$(git status --porcelain)",
    "  if [ -z \"$status\" ]; then",
    "    echo 'git pull failed on a clean checkout; not recloning.' >&2",
    "    exit 1",
    "  fi",
    "  current_dir=$(pwd)",
    "  parent_dir=$(dirname \"$current_dir\")",
    "  base_name=$(basename \"$current_dir\")",
    "  backup_dir=\"$parent_dir/$base_name.backup.$(date -u +%Y%m%dT%H%M%SZ)\"",
    "  temp_dir=\"$parent_dir/$base_name.tmp.$(date -u +%Y%m%dT%H%M%SZ)\"",
    "  echo \"Checkout is dirty; preserving it at $backup_dir and recloning $repo_url#$branch\"",
    "  cd \"$parent_dir\"",
    "  mv \"$current_dir\" \"$backup_dir\"",
    "  git clone --branch \"$branch\" \"$repo_url\" \"$temp_dir\"",
    "  for env_file in .env.local .env; do",
    "    if [ -f \"$backup_dir/$env_file\" ]; then",
    "      cp \"$backup_dir/$env_file\" \"$temp_dir/$env_file\"",
    "      chmod 600 \"$temp_dir/$env_file\" 2>/dev/null || true",
    "    fi",
    "  done",
    "  mv \"$temp_dir\" \"$current_dir\"",
    "  cd \"$current_dir\"",
    "fi",
    installScriptForCheckout(),
  ].join("\n");
}

function localUpdateScript() {
  return [
    "git pull --ff-only",
    installScriptForCheckout(),
  ].join("\n");
}

function fallbackScript(appDir?: string, allowReclone = false) {
  if (appDir?.trim()) {
    return [
      "set -euo pipefail",
      `cd ${shellSingleQuote(appDir.trim())}`,
      allowReclone ? remoteUpdateScript() : localUpdateScript(),
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
    allowReclone ? remoteUpdateScript() : localUpdateScript(),
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

function commandReachedRemote(error: string) {
  return /git pull|pnpm install|install-telemetry-collector|setup\.sh|exited with code/i.test(error);
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
  const script = fallbackScript(body.appDir, true);
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
  if (body.appDir?.trim()) {
    const status = await runProcess("git", ["-C", body.appDir.trim(), "status", "--porcelain"], null, 10_000);
    const dirtyFiles = status.stdout.trim();
    if (dirtyFiles) {
      throw new Error([
        "This Mac has uncommitted local changes, so HivemindOS will not run an automatic git pull over them.",
        "Commit, stash, or discard the local changes, then try Update again.",
        "",
        dirtyFiles.split("\n").slice(0, 24).join("\n"),
      ].join("\n"));
    }
  }
  const script = fallbackScript(body.appDir, false);
  const { stdout, stderr } = await runProcess("bash", ["-s"], script, 300_000);
  return { ok: true, accepted: true, method: "local-shell", target: "this machine", stdout, stderr, command: script };
}

export async function POST(request: Request) {
  const parsedBody = await request.json().catch(() => ({})) as UpdateBody;
  const body = await updateBodyWithTarget(parsedBody);
  try {
    const result = await (await isLocalCheckout(body.appDir)
      ? tryLocalShell(body)
      : body.collectorUrl
        ? tryCollectorUpdate(body)
        : tryTailscaleSsh(body));
    const verification = await waitForCollectorVerification(body);
    if (!verification.verified) {
      return Response.json({
        ok: false,
        error: verificationError(body, verification.health),
        method: result.method,
        stdout: "stdout" in result ? result.stdout : undefined,
        stderr: "stderr" in result ? result.stderr : undefined,
        health: verification.health,
        fallbackCommand: fallbackScript(body.appDir, false),
      }, { status: 502 });
    }
    return Response.json({ ...result, verified: true, health: verification.health });
  } catch (error) {
    const rawError = error instanceof Error ? error.message : "Update failed";
    if (commandReachedRemote(rawError)) {
      return Response.json({
        ok: false,
        error: rawError,
        fallbackCommand: fallbackScript(body.appDir, false),
      }, { status: 502 });
    }
    return Response.json({
      ok: false,
      error: rawError,
      fallbackCommand: fallbackScript(body.appDir, false),
    }, { status: 502 });
  }
}
