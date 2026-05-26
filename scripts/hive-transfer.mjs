#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { access, copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { homedir, hostname } from "node:os";
import { pathToFileURL } from "node:url";
import { constants } from "node:fs";

const TRANSFER_DIR = ".hivemindos-transfers";
const ACK_DIR = "acks";
const PAYLOAD_DIR = "payload";
const knownMediaTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".pdf", "application/pdf"],
  [".json", "application/json"],
  [".md", "text/markdown"],
  [".txt", "text/plain"],
  [".zip", "application/zip"],
]);

function expandHome(path) {
  return String(path || "").replace(/^~(?=$|\/)/, homedir());
}

function defaultSyncPath() {
  return expandHome(process.env.HIVEMINDOS_SYNC_PATH || process.env.NEXT_PUBLIC_OBSIDIAN_VAULT_PATH || "~/Documents/Obsidian/hivemindos-vault");
}

export function transferRoot(syncPath = defaultSyncPath()) {
  return join(resolve(expandHome(syncPath)), TRANSFER_DIR);
}

function safeIdPart(value, fallback = "any") {
  return String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

function safeFileName(value) {
  const name = basename(String(value || "payload"));
  const cleaned = name.replace(/[^A-Za-z0-9._ -]+/g, "-").replace(/^\.+/, "").trim();
  return cleaned || `payload-${randomBytes(4).toString("hex")}`;
}

function transferId() {
  return `hive-transfer-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(6).toString("hex")}`;
}

function mediaTypeFor(path) {
  return knownMediaTypes.get(extname(path).toLowerCase()) || "application/octet-stream";
}

async function sha256(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

function normalizeEndpoint(endpoint = {}) {
  return {
    machineId: String(endpoint.machineId || "").trim(),
    host: String(endpoint.host || "").trim(),
    runtime: String(endpoint.runtime || "").trim(),
    agentId: String(endpoint.agentId || endpoint.agent || "").trim(),
  };
}

function ackName({ machineId, runtime, agentId }) {
  return `${safeIdPart(machineId)}--${safeIdPart(runtime)}--${safeIdPart(agentId)}.json`;
}

function targetMatches(target = {}, query = {}) {
  const machineId = String(query.machineId || "").trim();
  const host = String(query.host || "").trim();
  const runtime = String(query.runtime || "").trim();
  const agentId = String(query.agentId || "").trim();
  const targetMachine = String(target.machineId || "").trim();
  const targetHost = String(target.host || "").trim();
  const targetRuntime = String(target.runtime || "").trim();
  const targetAgent = String(target.agentId || "").trim();

  if (targetMachine && machineId && targetMachine !== machineId) return false;
  if (!targetMachine && targetHost && host && targetHost !== host) return false;
  if (targetRuntime && runtime && targetRuntime !== runtime) return false;
  if (targetRuntime && !runtime) return false;
  if (targetAgent && agentId && targetAgent !== agentId) return false;
  return true;
}

function assertInside(parent, child) {
  const base = resolve(parent);
  const target = resolve(child);
  if (target !== base && !target.startsWith(`${base}${sep}`)) throw new Error("Transfer path escapes the shared transfer root.");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  return access(path, constants.F_OK).then(() => true).catch(() => false);
}

export async function createTransfer({ syncPath = defaultSyncPath(), file, files, note = "", from = {}, to = {} } = {}) {
  const fileList = (files || (file ? [file] : [])).map((entry) => resolve(expandHome(entry)));
  if (!fileList.length) throw new Error("At least one file is required.");

  const root = transferRoot(syncPath);
  const id = transferId();
  const dir = join(root, id);
  const payloadDir = join(dir, PAYLOAD_DIR);
  assertInside(root, dir);
  await mkdir(payloadDir, { recursive: true, mode: 0o700 });

  const payloads = [];
  for (const source of fileList) {
    const sourceStats = await stat(source);
    if (!sourceStats.isFile()) throw new Error(`${source} is not a file.`);
    const name = safeFileName(source);
    const destination = join(payloadDir, name);
    assertInside(payloadDir, destination);
    await copyFile(source, destination);
    payloads.push({
      name,
      mediaType: mediaTypeFor(source),
      bytes: sourceStats.size,
      sha256: await sha256(destination),
      path: join(TRANSFER_DIR, id, PAYLOAD_DIR, name),
    });
  }

  const manifest = {
    id,
    schema: "hivemind.transfer.v1",
    status: "pending",
    createdAt: new Date().toISOString(),
    note: String(note || ""),
    from: normalizeEndpoint({ host: hostname(), ...from }),
    to: normalizeEndpoint(to),
    payloads,
  };
  await writeFile(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return manifest;
}

export async function listTransfers({ syncPath = defaultSyncPath(), machineId = "", host = hostname(), runtime = "", agentId = "", includeAcknowledged = false } = {}) {
  const root = transferRoot(syncPath);
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    const manifestPath = join(dir, "manifest.json");
    const manifest = await readJson(manifestPath).catch(() => null);
    if (!manifest || manifest.schema !== "hivemind.transfer.v1") continue;
    if (manifest.status !== "pending") continue;
    if (!targetMatches(manifest.to, { machineId, host, runtime, agentId })) continue;

    const acknowledged = await exists(join(dir, ACK_DIR, ackName({ machineId, runtime, agentId })));
    if (acknowledged && !includeAcknowledged) continue;

    results.push({
      ...manifest,
      acknowledged,
      transferPath: dir,
      payloads: (manifest.payloads || []).map((payload) => ({
        ...payload,
        path: join(dir, PAYLOAD_DIR, payload.name),
      })),
    });
  }
  results.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return results;
}

export async function acknowledgeTransfer({ syncPath = defaultSyncPath(), id, machineId = "", runtime = "", agentId = "" } = {}) {
  if (!id || !/^hive-transfer-[A-Za-z0-9._-]+$/.test(id)) throw new Error("A valid transfer id is required.");
  const root = transferRoot(syncPath);
  const dir = join(root, id);
  assertInside(root, dir);
  const manifest = await readJson(join(dir, "manifest.json"));
  const ackDir = join(dir, ACK_DIR);
  await mkdir(ackDir, { recursive: true, mode: 0o700 });
  const ack = {
    id,
    acknowledgedAt: new Date().toISOString(),
    by: normalizeEndpoint({ machineId, runtime, agentId }),
  };
  await writeFile(join(ackDir, ackName({ machineId, runtime, agentId })), `${JSON.stringify(ack, null, 2)}\n`, { mode: 0o600 });
  return { ok: true, id, transfer: manifest, ack };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === "send") {
    const transfer = await createTransfer({
      syncPath: args.syncPath,
      files: args._,
      note: args.note || "",
      from: { machineId: args.fromMachine, host: args.fromHost, runtime: args.fromRuntime, agentId: args.fromAgent },
      to: { machineId: args.toMachine, host: args.toHost, runtime: args.toRuntime, agentId: args.toAgent },
    });
    console.log(JSON.stringify({ ok: true, transfer }, null, 2));
    return;
  }
  if (command === "inbox") {
    const transfers = await listTransfers({
      syncPath: args.syncPath,
      machineId: args.machine,
      host: args.host,
      runtime: args.runtime,
      agentId: args.agent,
      includeAcknowledged: Boolean(args.all),
    });
    console.log(JSON.stringify({ ok: true, transfers }, null, 2));
    return;
  }
  if (command === "ack") {
    const result = await acknowledgeTransfer({
      syncPath: args.syncPath,
      id: args._[0] || args.id,
      machineId: args.machine,
      runtime: args.runtime,
      agentId: args.agent,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.error("Usage: hive-transfer.mjs send [--toMachine ID|--toHost HOST] [--toRuntime RUNTIME] [--toAgent AGENT] FILE...");
  console.error("       hive-transfer.mjs inbox [--machine ID] [--runtime RUNTIME] [--agent AGENT] [--all]");
  console.error("       hive-transfer.mjs ack ID [--machine ID] [--runtime RUNTIME] [--agent AGENT]");
  process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
