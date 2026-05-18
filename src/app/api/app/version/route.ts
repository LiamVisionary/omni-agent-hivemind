import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function git(args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: process.cwd(),
    timeout: 5_000,
    maxBuffer: 300_000,
  });
  return stdout.trim();
}

async function safeGit(args: string[]) {
  return git(args).catch(() => "");
}

export async function GET() {
  const [commit, branch, dirty, remoteCommit] = await Promise.all([
    safeGit(["rev-parse", "HEAD"]),
    safeGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    safeGit(["status", "--porcelain"]),
    safeGit(["ls-remote", "origin", "main"]),
  ]);
  const latestCommit = remoteCommit.split(/\s+/)[0] || commit;

  return Response.json({
    ok: true,
    appDir: process.cwd(),
    commit,
    shortCommit: commit.slice(0, 7),
    branch,
    dirty: dirty.length > 0,
    latestCommit,
    latestShortCommit: latestCommit.slice(0, 7),
    updateCommand: "git pull && ./setup.sh",
  });
}
