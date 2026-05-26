import { spawn } from "child_process";
import { join } from "path";

export const runtime = "nodejs";

type TokenBody = {
  token?: string;
};

type HetznerErrorBody = {
  error?: {
    message?: string;
  };
};

async function validateHetznerToken(token: string) {
  const response = await fetch("https://api.hetzner.cloud/v1/locations", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "HivemindOS Hetzner validator",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.ok) return;

  const body = await response.json().catch(() => null) as HetznerErrorBody | null;
  const detail = body?.error?.message?.trim();
  if (response.status === 401 || response.status === 403) {
    throw new Error(detail || "Hetzner rejected this token. Check the key and try again.");
  }
  throw new Error(detail || `Hetzner validation failed with HTTP ${response.status}.`);
}

function runHiveEnvAdd(token: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(join(process.cwd(), "scripts", "hive-env-add"), [
      "--stdin",
      "--no-backup",
      "--no-tailnet-sync",
      "HCLOUD_TOKEN",
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let errorText = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Timed out while saving the Hetzner token."));
    }, 15_000);
    child.stderr.on("data", (chunk) => {
      errorText += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(errorText.trim() || "hive-env-add could not save HCLOUD_TOKEN."));
    });
    child.stdin.end(token);
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as TokenBody;
  const token = body.token?.trim();

  if (!token) {
    return Response.json({ ok: false, error: "Hetzner Cloud API token is required." }, { status: 400 });
  }

  try {
    await validateHetznerToken(token);
    await runHiveEnvAdd(token);
    return Response.json({ ok: true, message: "Validated with Hetzner Cloud and saved HCLOUD_TOKEN locally." });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not validate and save the Hetzner token.",
    }, { status: 500 });
  }
}
