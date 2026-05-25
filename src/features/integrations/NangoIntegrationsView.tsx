"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleAlert,
  Cloud,
  FileText,
  GitPullRequest,
  KeyRound,
  Link2,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Server,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NangoHostConfig, NangoIntegrationPayload, NangoProviderKey } from "@/lib/types/integrations";
import styles from "@/app/integrations/integrations.module.css";

type FleetMachine = {
  device?: {
    self?: boolean;
    name?: string;
    dnsName?: string;
    os?: string;
    online?: boolean;
    ip?: string;
    collectorUrl?: string;
  };
  collector?: string;
  envSync?: { ready?: boolean };
};

type MachineChoice = {
  id: string;
  name: string;
  os: string;
  online: boolean;
  collectorReady: boolean;
  envReady: boolean;
  self: boolean;
  baseUrl: string;
  rank: number;
  note: string;
};

const PROVIDERS: Array<{
  key: NangoProviderKey;
  label: string;
  icon: React.ReactNode;
  detail: string;
}> = [
  { key: "github", label: "GitHub", icon: <GitPullRequest size={19} />, detail: "Issues, pull requests, reviews, releases." },
  { key: "linear", label: "Linear", icon: <Workflow size={19} />, detail: "Tasks, triage queues, project status." },
  { key: "slack", label: "Slack", icon: <MessageSquare size={19} />, detail: "Mentions, channels, approval messages." },
  { key: "notion", label: "Notion", icon: <FileText size={19} />, detail: "Docs, project pages, task databases." },
  { key: "google", label: "Google", icon: <Cloud size={19} />, detail: "Drive, Gmail labels, Calendar context." },
];

type NangoIntegrationsViewProps = {
  embedded?: boolean;
};

export default function NangoIntegrationsView({ embedded = false }: NangoIntegrationsViewProps) {
  const [payload, setPayload] = React.useState<NangoIntegrationPayload | null>(null);
  const [machines, setMachines] = React.useState<MachineChoice[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [envSaving, setEnvSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const refresh = React.useCallback(async () => {
    setMessage("");
    const nangoResponse = await fetch("/api/integrations/nango", { cache: "no-store" });
    const nextPayload = await nangoResponse.json() as NangoIntegrationPayload;
    setPayload(nextPayload);
    const fallbackChoices = machineChoices([], nextPayload.config);
    setMachines(fallbackChoices);
    setSelectedId(nextPayload.config.hostMachineId || fallbackChoices[0]?.id || "self");

    const fleetResponse = await fetch("/api/fleet/discover", { cache: "no-store" }).catch(() => null);
    const fleet = fleetResponse?.ok ? await fleetResponse.json() as { machines?: FleetMachine[] } : { machines: [] };
    const choices = machineChoices(fleet.machines ?? [], nextPayload.config);
    setMachines(choices);
    setSelectedId((current) => {
      if (nextPayload.config.hostMachineId) return nextPayload.config.hostMachineId;
      return !current || current === "self" ? choices[0]?.id ?? "self" : current;
    });
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const selected = machines.find((machine) => machine.id === selectedId) ?? machines[0];
  const providerSet = new Set(payload?.config.allowedProviders ?? []);

  async function saveHost() {
    if (!payload || !selected) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/nango", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          hostMachineId: selected.id,
          hostMachineName: selected.name,
          baseUrl: selected.baseUrl,
          mode: selected.self ? "local" : "tailnet",
          allowedProviders: payload.config.allowedProviders,
        }),
      });
      const nextPayload = await response.json() as NangoIntegrationPayload & { error?: string };
      if (!response.ok) throw new Error(nextPayload.error ?? "Could not save integration host.");
      setPayload(nextPayload);
      setMessage(`Integration host set to ${selected.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save integration host.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEnv() {
    if (!payload) return;
    setEnvSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: "shared",
          entries: {
            HIVE_NANGO_ENABLED: String(payload.config.enabled),
            HIVE_NANGO_HOST_MACHINE: payload.config.hostMachineId,
            HIVE_NANGO_ALLOWED_PROVIDERS: payload.config.allowedProviders.join(","),
            NANGO_BASE_URL: payload.config.baseUrl,
          },
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) throw new Error(result.error ?? "Could not sync shared env.");
      setMessage("Non-secret Nango env synced through hive-env-add.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sync shared env.");
    } finally {
      setEnvSaving(false);
    }
  }

  async function toggleProvider(provider: NangoProviderKey) {
    if (!payload) return;
    const providers = providerSet.has(provider)
      ? payload.config.allowedProviders.filter((item) => item !== provider)
      : [...payload.config.allowedProviders, provider];
    const response = await fetch("/api/integrations/nango", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedProviders: providers }),
    });
    if (response.ok) setPayload(await response.json() as NangoIntegrationPayload);
  }

  const ready = payload?.health.ok === true;
  const configured = Boolean(payload?.config.hostMachineId && payload.config.baseUrl);

  return (
    <main className={`${styles.page} ${embedded ? styles.embedded : ""}`}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <div className={styles.eyebrow}>HivemindOS · Integrations</div>
            <h1 className={styles.title}>Integration Host</h1>
            <p className={styles.subtitle}>
              Pick the always-on machine that runs Nango for the hive. HivemindOS stores provider tokens there,
              syncs only non-secret host metadata, and keeps agent access behind local policy.
            </p>
          </div>
          <div className={styles.statusCluster}>
            <StatusBadge good={configured} label={configured ? "host selected" : "needs host"} />
            <StatusBadge good={ready} warn={configured && !ready} label={ready ? "Nango healthy" : "health pending"} />
            <StatusBadge good={payload?.env.secretConfigured === true} warn label={payload?.env.secretConfigured ? "secret present" : "secret not synced"} />
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.panel}>
            <div className={styles.row}>
              <h2 className={styles.sectionTitle}>Host</h2>
              <Button variant="ghost" size="sm" onClick={() => void refresh()}>
                <RefreshCw /> Refresh
              </Button>
            </div>

            <select
              className={styles.hostSelect}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              aria-label="Integration host machine"
            >
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name} · {machine.note}
                </option>
              ))}
            </select>

            <div className={styles.machineList}>
              {machines.slice(0, 5).map((machine) => (
                <button
                  key={machine.id}
                  className={`${styles.machineButton} ${machine.id === selectedId ? styles.machineButtonSelected : ""}`}
                  type="button"
                  onClick={() => setSelectedId(machine.id)}
                >
                  <div className={styles.row}>
                    <strong>{machine.name}</strong>
                    <span className={`${styles.badge} ${machine.rank >= 80 ? styles.badgeGood : machine.rank >= 45 ? styles.badgeWarn : styles.badgeBad}`}>
                      {machine.rank >= 80 ? "Recommended" : machine.self ? "Temporary" : "Check"}
                    </span>
                  </div>
                  <div className={`${styles.muted} ${styles.small}`}>
                    {machine.os} · {machine.baseUrl}
                  </div>
                  <div className={`${styles.muted} ${styles.small}`}>{machine.note}</div>
                </button>
              ))}
            </div>

            <div className={styles.checklist}>
              <CheckItem ok={Boolean(selected?.online)} label="Tailscale reachable" detail={selected?.online ? "Machine is currently online." : "Machine is offline or unavailable."} />
              <CheckItem ok={Boolean(selected && !selected.self)} warn={selected?.self} label="Always-on candidate" detail={selected?.self ? "This Mac is useful for testing but may sleep when closed." : "Remote host is a better default for shared API access."} />
              <CheckItem ok={ready} warn={configured && !ready} label="Nango API health" detail={payload?.health.ok ? `${payload.health.url} responded in ${payload.health.latencyMs ?? 0}ms.` : payload?.health.error || "Nango is not responding yet."} />
              <CheckItem ok={payload?.env.secretConfigured === true} warn label="Nango secret" detail={payload?.env.secretConfigured ? "NANGO_SECRET_KEY is configured in this runtime." : "Add NANGO_SECRET_KEY through hive-env-add after Nango is installed."} />
            </div>

            <div className={styles.actions}>
              <Button onClick={() => void saveHost()} isLoading={saving} disabled={!selected}>
                <Server /> Use selected host
              </Button>
              <Button variant="secondary" onClick={() => void saveEnv()} isLoading={envSaving} disabled={!payload?.config.enabled}>
                <KeyRound /> Sync shared env
              </Button>
              {payload?.config.baseUrl ? (
                <Button asChild variant="ghost">
                  <a href={payload.config.baseUrl} target="_blank" rel="noreferrer">
                    <span className="inline-flex items-center gap-2"><Link2 /> Open Nango</span>
                  </a>
                </Button>
              ) : null}
            </div>
            {message ? <p className={styles.muted}>{message}</p> : null}
          </section>

          <section className={styles.panel}>
            <div className={styles.row}>
              <h2 className={styles.sectionTitle}>Provider Access</h2>
              <span className={styles.badge}>{payload?.connections.length ?? 0} connected</span>
            </div>
            <div className={styles.providers}>
              {PROVIDERS.map((provider) => (
                <article key={provider.key} className={styles.provider}>
                  <div className={styles.row}>
                    <div className={styles.providerIcon}>{provider.icon}</div>
                    <label className={styles.providerToggle}>
                      <input
                        type="checkbox"
                        checked={providerSet.has(provider.key)}
                        onChange={() => void toggleProvider(provider.key)}
                      />
                      Enabled
                    </label>
                  </div>
                  <div>
                    <strong>{provider.label}</strong>
                    <p className={`${styles.muted} ${styles.small}`}>{provider.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            <h2 className={styles.sectionTitle} style={{ marginTop: 20 }}>Connected Accounts</h2>
            <div className={styles.connections}>
              {!payload ? (
                <div className={styles.activityRow}><LoaderCircle className="animate-spin" /> Loading integrations.</div>
              ) : payload.connections.length ? payload.connections.map((connection) => (
                <div key={`${connection.providerConfigKey}:${connection.id}`} className={styles.activityRow}>
                  <div className={styles.row}>
                    <strong>{connection.providerConfigKey}</strong>
                    <span className={`${styles.badge} ${styles.badgeGood}`}>Connected</span>
                  </div>
                  <div className={`${styles.muted} ${styles.small}`}>
                    {connection.displayName || connection.email || connection.id}
                  </div>
                </div>
              )) : (
                <div className={styles.activityRow}>
                  <strong>No connected accounts visible yet.</strong>
                  <p className={`${styles.muted} ${styles.small}`}>
                    Once Nango is running and `NANGO_SECRET_KEY` is configured, connected accounts will show here.
                    OAuth tokens remain inside the Nango host database.
                  </p>
                </div>
              )}
              {payload?.connectionError ? (
                <div className={styles.activityRow}>
                  <span className={`${styles.badge} ${styles.badgeWarn}`}>Connection check</span>
                  <p className={`${styles.muted} ${styles.small}`}>{payload.connectionError}</p>
                </div>
              ) : null}
            </div>

            <h2 className={styles.sectionTitle} style={{ marginTop: 20 }}>Host Setup Commands</h2>
            <pre className={styles.codeBlock}>{(payload?.setupCommands ?? []).join("\n")}</pre>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ good, warn, label }: { good?: boolean; warn?: boolean; label: string }) {
  return (
    <span className={`${styles.badge} ${good ? styles.badgeGood : warn ? styles.badgeWarn : styles.badgeBad}`}>
      {good ? <CheckCircle2 size={14} /> : warn ? <CircleAlert size={14} /> : <CircleAlert size={14} />}
      {label}
    </span>
  );
}

function CheckItem({ ok, warn, label, detail }: { ok?: boolean; warn?: boolean; label: string; detail: string }) {
  const Icon = ok ? CheckCircle2 : warn ? CircleAlert : CircleAlert;
  return (
    <div className={styles.checkItem}>
      <Icon className={ok ? styles.iconGood : warn ? styles.iconWarn : styles.iconBad} size={18} />
      <div>
        <strong>{label}</strong>
        <div className={`${styles.muted} ${styles.small}`}>{detail}</div>
      </div>
    </div>
  );
}

function machineChoices(machines: FleetMachine[], config: NangoHostConfig): MachineChoice[] {
  const choices = machines.map((machine) => {
    const device = machine.device ?? {};
    const name = device.self ? "This Mac" : device.name || dnsLabel(device.dnsName) || device.ip || "Unknown machine";
    const id = device.self ? "self" : normalizeId(device.dnsName || device.name || device.ip || name);
    const online = device.self || device.online === true;
    const collectorReady = machine.collector === "ready";
    const envReady = machine.envSync?.ready === true;
    const serverLike = /linux|ubuntu|debian|server|cloud|hetzner/i.test(`${device.os} ${name} ${device.dnsName}`);
    const baseHost = device.self ? "127.0.0.1" : (device.dnsName || device.ip || name).replace(/\.$/, "");
    const rank = (online ? 32 : 0) + (collectorReady ? 18 : 0) + (envReady ? 14 : 0) + (serverLike ? 28 : 0) + (device.self ? 4 : 0);
    return {
      id,
      name,
      os: device.os || "unknown OS",
      online,
      collectorReady,
      envReady,
      self: device.self === true,
      baseUrl: `http://${baseHost}:3003`,
      rank,
      note: device.self ? "current machine, may sleep" : serverLike ? "always-on candidate" : "tailnet machine",
    };
  });

  if (!choices.some((choice) => choice.id === "self")) {
    choices.push({
      id: "self",
      name: "This Mac",
      os: "local",
      online: true,
      collectorReady: false,
      envReady: false,
      self: true,
      baseUrl: "http://127.0.0.1:3003",
      rank: 18,
      note: "current machine, may sleep",
    });
  }

  if (config.hostMachineId && !choices.some((choice) => choice.id === config.hostMachineId)) {
    choices.push({
      id: config.hostMachineId,
      name: config.hostMachineName || config.hostMachineId,
      os: "saved host",
      online: false,
      collectorReady: false,
      envReady: false,
      self: false,
      baseUrl: config.baseUrl,
      rank: 10,
      note: "saved host, not in current fleet snapshot",
    });
  }

  return choices.sort((left, right) => right.rank - left.rank || left.name.localeCompare(right.name));
}

function dnsLabel(value?: string) {
  return value?.replace(/\.$/, "").split(".")[0] ?? "";
}

function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "machine";
}
