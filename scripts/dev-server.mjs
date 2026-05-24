#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const nextArgs = [];
let port = process.env.PORT || "5020";

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if ((arg === "-p" || arg === "--port") && args[i + 1]) {
    port = args[i + 1];
    i += 1;
    continue;
  }

  if (arg.startsWith("--port=")) {
    port = arg.slice("--port=".length);
    continue;
  }

  if (/^-p\d+$/.test(arg)) {
    port = arg.slice(2);
    continue;
  }

  nextArgs.push(arg);
}

const command = "scripts/run-with-memory-limit.sh";
const commandArgs = [
  "--limit-mb",
  process.env.MEMORY_LIMIT_MB || "5000",
  "--",
  "next",
  "dev",
  "--webpack",
  "-p",
  port,
  ...nextArgs,
];

const child = spawn(command, commandArgs, { stdio: "inherit" });

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
