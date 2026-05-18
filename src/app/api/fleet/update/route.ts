import { spawn } from "child_process";
import { appendFile, mkdir, readFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";

export const runtime = "nodejs";

type UpdateBody = {
  collectorUrl?: string;
  dnsName?: string;
  name?: string;
  ip?: string;
  appDir?: string;
  updateCommand?: string;
};

type CollectorUpdateAttempt = {
  result: unknown | null;
  reachable: boolean;
  missingUpdater: boolean;
  error?: string;
};

async function tryCollectorUpdate(collectorUrl?: string) {
  const emptyAttempt: CollectorUpdateAttempt = {
    result: null,
    reachable: false,
    missingUpdater: false,
  };
  if (!collectorUrl) return emptyAttempt;
  const response = await fetch(`${collectorUrl.replace(/\/+$/, "")}/update`, {
    method: "POST",
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  });
  if (!response || "error" in response) {
    return { ...emptyAttempt, error: response?.error ?? "collector update request failed" };
  }

  const payload = await response.json().catch(() => null);
  const missingUpdater = response.status === 404 || payload?.error === "not found";
  if (!response.ok || payload?.ok === false) {
    return {
      result: null,
      reachable: true,
      missingUpdater,
      error: payload?.error ?? `collector update returned HTTP ${response.status}`,
    };
  }

  return {
    result: payload ?? { ok: true, accepted: true },
    reachable: true,
    missingUpdater: false,
  };
}

function shellSingleQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function fallbackScript(appDir?: string, updateCommand?: string) {
  if (updateCommand?.trim()) return updateCommand.trim();
  if (appDir?.trim()) {
    return [
      "set -euo pipefail",
      `cd ${shellSingleQuote(appDir.trim())}`,
      "git pull --ff-only",
      "./setup.sh",
    ].join("\n");
  }
  const candidates = [
    "\"$HOME/omni-agent-hivemind\"",
    "\"$HOME/openclaw-next\"",
    "/root/omni-agent-hivemind",
    "/opt/omni-agent-hivemind",
  ];
  return [
    "set -euo pipefail",
    "for d in " + candidates.join(" ") + "; do",
    "  if [ -d \"$d/.git\" ]; then",
    "    cd \"$d\"",
    "    break",
    "  fi",
    "done",
    "[ -d .git ] || { echo 'Could not find omni-agent-hivemind checkout'; exit 2; }",
    "git pull --ff-only",
    "./setup.sh",
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

async function primeKnownHost(target: string) {
  const host = target.replace(/^[^@]+@/, "");
  const knownHostsPath = join(homedir(), ".ssh", "known_hosts");
  const { stdout } = await runProcess("ssh-keyscan", ["-T", "8", "-t", "ed25519", host], null, 12_000);
  const keyLines = stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith("#"));
  if (keyLines.length === 0) {
    throw new Error(`Could not read SSH host key for ${host}`);
  }
  await mkdir(dirname(knownHostsPath), { recursive: true, mode: 0o700 });
  const existing = await readFile(knownHostsPath, "utf-8").catch(() => "");
  const additions = keyLines.filter((line) => !existing.includes(line));
  if (additions.length > 0) {
    await appendFile(knownHostsPath, `${additions.join("\n")}\n`, { mode: 0o600 });
  }
}

function combineOutput(...parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join("\n\n");
}

async function runTailscaleSsh(target: string, script: string) {
  let primeWarning = "";
  try {
    await primeKnownHost(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    primeWarning = `Could not preflight SSH host key for ${target}: ${message}`;
  }

  try {
    const result = await runProcess("tailscale", ["ssh", target, "bash", "-s"], script, 180_000);
    return {
      ...result,
      stderr: combineOutput(primeWarning, result.stderr),
    };
  } catch (error) {
    if (!isUnknownHostKeyError(error)) throw error;
    await primeKnownHost(target);
    return runProcess("tailscale", ["ssh", target, "bash", "-s"], script, 180_000);
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
        "StrictHostKeyChecking=accept-new",
        sshTarget,
        "bash",
        "-s",
      ], script, 180_000);
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
  const script = fallbackScript(body.appDir, body.updateCommand);
  const { stdout, stderr } = await runRemoteShell(target, script);
  return { ok: true, accepted: true, method: "remote-shell", target, stdout, stderr, command: script };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as UpdateBody;
  const collectorAttempt = await tryCollectorUpdate(body.collectorUrl);
  if (collectorAttempt.result) {
    return Response.json({ ok: true, method: "collector", result: collectorAttempt.result });
  }

  try {
    const result = await tryTailscaleSsh(body);
    return Response.json(result);
  } catch (error) {
    const rawError = error instanceof Error ? error.message : "Update failed";
    const staleCollectorMessage = "This machine is online and reporting agent activity, but its collector is too old to update itself. This dashboard also cannot open SSH to that machine yet. Run the fallback command once on that machine; after that, the Update button will work directly from here.";
    return Response.json({
      ok: false,
      error: collectorAttempt.reachable && collectorAttempt.missingUpdater ? staleCollectorMessage : rawError,
      details: collectorAttempt.reachable && collectorAttempt.missingUpdater ? rawError : undefined,
      fallbackCommand: fallbackScript(body.appDir, body.updateCommand),
    }, { status: 502 });
  }
}
