import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";

const MACHINE_ALIAS_FILE = "machine-aliases.json";
const MACHINE_ALIAS_FOLDER = "HivemindOS";

export type MachineAliasMap = Record<string, string>;

function cleanAliases(value: unknown): MachineAliasMap {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, alias]) => key.trim() && typeof alias === "string" && alias.trim())
    .map(([key, alias]) => [key, String(alias).trim()]));
}

function aliasFile(vaultPath?: string | null) {
  const vaultRoot = resolveObsidianVaultPath(vaultPath ?? undefined, { requireWritable: true });
  return join(vaultRoot, MACHINE_ALIAS_FOLDER, MACHINE_ALIAS_FILE);
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as unknown;
  } catch {
    return {};
  }
}

async function writeJsonAtomic(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await rename(tmp, path);
}

export async function readMachineAliases(vaultPath?: string | null) {
  const file = aliasFile(vaultPath);
  return {
    file,
    aliases: cleanAliases(await readJson(file)),
  };
}

export async function writeMachineAlias(input: {
  vaultPath?: string | null;
  machineKey: string;
  name: string;
}) {
  const file = aliasFile(input.vaultPath);
  const current = cleanAliases(await readJson(file));
  const machineKey = input.machineKey.trim();
  if (!machineKey) throw new Error("Missing machine key.");
  const name = input.name.trim();
  if (name) current[machineKey] = name;
  else delete current[machineKey];
  await writeJsonAtomic(file, current);
  return { file, aliases: current };
}
