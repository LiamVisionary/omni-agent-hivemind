#!/usr/bin/env node
import readline from "node:readline";

const labels = [
  "Import all skills into shared hivemind",
  "Codex",
  "Claude",
  "Hermes",
  "Gemini",
  "OpenClaw",
  "Aeon",
  "Continue",
];
const values = ["all", "codex", "claude", "hermes", "gemini", "openclaw", "aeon", "continue"];
const selected = [true, false, false, false, false, false, false, false];
let cursor = 0;

function render() {
  process.stderr.write("\x1b[2J\x1b[H");
  process.stderr.write("\x1b[1;36mShared skill setup\x1b[0m\n");
  process.stderr.write("Use Up/Down to move, Enter or Space to toggle, then choose Continue.\n\n");
  for (let index = 0; index < labels.length; index += 1) {
    const active = index === cursor;
    process.stderr.write(active ? "  \x1b[7m" : "  ");
    if (values[index] === "continue") {
      process.stderr.write(`   ${labels[index]}`);
    } else {
      process.stderr.write(`${selected[index] ? "[✓]" : "[ ]"} ${labels[index]}`);
    }
    process.stderr.write(active ? "\x1b[0m\n" : "\n");
  }
}

function toggle() {
  if (values[cursor] === "continue") return true;
  if (cursor === 0) {
    selected.fill(false);
    selected[0] = true;
    return false;
  }
  selected[0] = false;
  selected[cursor] = !selected[cursor];
  return false;
}

function finish() {
  process.stderr.write("\x1b[?25h\x1b[2J\x1b[H");
  if (selected[0]) {
    process.stdout.write("all");
  } else {
    const picked = values.slice(1, 7).filter((_, index) => selected[index + 1]);
    process.stdout.write(picked.length ? picked.join(",") : "none");
  }
  process.exit(0);
}

if (!process.stdin.isTTY) {
  process.stdout.write("all");
  process.exit(0);
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stderr.write("\x1b[?25l");
render();

process.stdin.on("keypress", (_str, key = {}) => {
  if (key.ctrl && key.name === "c") {
    process.stderr.write("\x1b[?25h\n");
    process.exit(130);
  }
  if (key.name === "up" || key.name === "k") {
    cursor = Math.max(0, cursor - 1);
    render();
    return;
  }
  if (key.name === "down" || key.name === "j") {
    cursor = Math.min(labels.length - 1, cursor + 1);
    render();
    return;
  }
  if (key.name === "space" || key.name === "return") {
    if (toggle()) finish();
    render();
    return;
  }
  if (key.name === "q" || key.name === "escape") {
    selected.fill(false);
    finish();
  }
});
