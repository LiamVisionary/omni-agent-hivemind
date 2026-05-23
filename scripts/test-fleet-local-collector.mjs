import { strict as assert } from "node:assert";
import { performance } from "node:perf_hooks";

const dashboardUrl = process.env.DASHBOARD_URL || "http://127.0.0.1:5020";
const collectorUrl = process.env.COLLECTOR_URL || "http://127.0.0.1:8787";

async function readJson(url, timeoutMs = 10_000) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  assert.equal(response.ok, true, `${url} returned ${response.status} ${response.statusText}`);
  return response.json();
}

const collectorHealth = await readJson(`${collectorUrl}/health`, 3_000);
assert.equal(collectorHealth.ok, true, "Local collector health should be ok");

const tailscaleDevices = await readJson(`${dashboardUrl}/api/tailscale/devices`, 5_000);
const selfDevice = tailscaleDevices.devices?.find((device) => device.self);
assert.ok(selfDevice, "Tailscale device discovery should include a self device");
assert.equal(
  selfDevice.collectorUrl,
  collectorUrl,
  "The self Tailscale device must use localhost for collector checks",
);

const startedAt = performance.now();
const fleetDiscovery = await readJson(`${dashboardUrl}/api/fleet/discover`, 12_000);
const elapsedMs = performance.now() - startedAt;
const selfMachine = fleetDiscovery.machines?.find((machine) => machine.device?.self);

assert.ok(selfMachine, "Fleet discovery should include this machine");
assert.equal(
  selfMachine.device.collectorUrl,
  collectorUrl,
  "Fleet discovery must use localhost for this machine's collector",
);
assert.equal(selfMachine.collector, "ready", "This Mac should be ready when local collector health is ok");
assert.ok(
  elapsedMs < 8_000,
  `Fleet discovery should not hang on unreachable peers; took ${Math.round(elapsedMs)}ms`,
);

console.log(`Fleet local collector e2e passed in ${Math.round(elapsedMs)}ms.`);
