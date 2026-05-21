import { spawn } from "child_process";
import { join } from "path";

export const runtime = "nodejs";

type TokenBody = {
  token?: string;
};

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
    await runHiveEnvAdd(token);
    return Response.json({ ok: true, message: "Saved HCLOUD_TOKEN locally with hive-env-add." });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the Hetzner token.",
    }, { status: 500 });
  }
}
