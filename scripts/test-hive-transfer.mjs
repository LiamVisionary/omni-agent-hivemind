#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  createTransfer,
  listTransfers,
  acknowledgeTransfer,
  transferRoot,
} from "./hive-transfer.mjs";

const root = await mkdtemp(join(tmpdir(), "hive-transfer-test-"));
try {
  const source = join(root, "source.png");
  await writeFile(source, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]));

  const transfer = await createTransfer({
    syncPath: root,
    file: source,
    note: "preview image for renderer",
    from: { machineId: "machine-mac", host: "This Mac", runtime: "hermes", agentId: "designer" },
    to: { machineId: "machine-vps", host: "Ubuntu VPS", runtime: "hermes", agentId: "renderer" },
  });

  assert.match(transfer.id, /^hive-transfer-[0-9TZ-]+-[a-f0-9]{12}$/);
  assert.equal(transfer.status, "pending");
  assert.equal(transfer.to.machineId, "machine-vps");
  assert.equal(transfer.to.runtime, "hermes");
  assert.equal(transfer.to.agentId, "renderer");
  assert.equal(transfer.payloads.length, 1);

  const manifestPath = join(transferRoot(root), transfer.id, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.note, "preview image for renderer");
  assert.equal(manifest.payloads[0].name, "source.png");
  assert.equal(manifest.payloads[0].mediaType, "image/png");
  assert.equal((await stat(join(transferRoot(root), transfer.id, "payload", "source.png"))).size, 6);

  const wrongMachine = await listTransfers({ syncPath: root, machineId: "machine-other", runtime: "hermes", agentId: "renderer" });
  assert.equal(wrongMachine.length, 0);

  const wrongAgent = await listTransfers({ syncPath: root, machineId: "machine-vps", runtime: "hermes", agentId: "writer" });
  assert.equal(wrongAgent.length, 0);

  const runtimeInbox = await listTransfers({ syncPath: root, machineId: "machine-vps", runtime: "hermes" });
  assert.equal(runtimeInbox.length, 1, "runtime-level agent should see transfers for any agent on that runtime");

  const exactInbox = await listTransfers({ syncPath: root, machineId: "machine-vps", runtime: "hermes", agentId: "renderer" });
  assert.equal(exactInbox.length, 1);
  assert.equal(exactInbox[0].payloads[0].path.endsWith("/payload/source.png"), true);

  const ack = await acknowledgeTransfer({ syncPath: root, id: transfer.id, machineId: "machine-vps", runtime: "hermes", agentId: "renderer" });
  assert.equal(ack.ok, true);

  const pendingAfterAck = await listTransfers({ syncPath: root, machineId: "machine-vps", runtime: "hermes", agentId: "renderer" });
  assert.equal(pendingAfterAck.length, 0);

  const includeAcked = await listTransfers({ syncPath: root, machineId: "machine-vps", runtime: "hermes", agentId: "renderer", includeAcknowledged: true });
  assert.equal(includeAcked.length, 1);
  assert.equal(includeAcked[0].acknowledged, true);

  console.log("hive transfer tests passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
