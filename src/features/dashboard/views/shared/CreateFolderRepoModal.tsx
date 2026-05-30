"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FolderOpen, LoaderCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { KanbanMachineTarget } from "@/lib/types/kanban";
import type { LinkedDirectory } from "@/features/dashboard/dashboard-types";

export type CreateFolderRepoValue = {
  name: string;
  parentPath: string;
  fullPath: string;
  machine: KanbanMachineTarget;
};

type MachineOption = {
  id: string;
  machine: KanbanMachineTarget;
};

type CreateFolderRepoModalProps = {
  open: boolean;
  title: string;
  eyebrow?: string;
  description?: string;
  nameLabel?: string;
  pathLabel?: string;
  defaultName: string;
  defaultParentPath: string;
  submitLabel: string;
  busy?: boolean;
  machines: KanbanMachineTarget[];
  icon?: ReactNode;
  onClose: () => void;
  onSubmit: (value: CreateFolderRepoValue) => void | Promise<void>;
  onBrowseDirectory?: (machine: KanbanMachineTarget, onChoose: (directory: LinkedDirectory) => void) => void | Promise<void>;
};

function folderSlug(value: string, fallback = "workspace") {
  return (value || fallback)
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || fallback;
}

function joinDisplayPath(parentPath: string, name: string) {
  const parent = (parentPath.trim() || "~").replace(/\/+$/, "");
  return `${parent}/${folderSlug(name)}`;
}

function machineOptionId(machine: KanbanMachineTarget, index: number) {
  return `${machine.key || "machine"}::${machine.collectorUrl || ""}::${index}`;
}

export function CreateFolderRepoModal({
  open,
  title,
  eyebrow = "Create",
  description,
  nameLabel = "Name",
  pathLabel = "Location",
  defaultName,
  defaultParentPath,
  submitLabel,
  busy = false,
  machines,
  icon,
  onClose,
  onSubmit,
  onBrowseDirectory,
}: CreateFolderRepoModalProps) {
  const machineOptions = useMemo(() => (
    machines.length ? machines : [{ key: "local", name: "This Mac", collectorUrl: "http://127.0.0.1" }]
  ), [machines]);
  const machineChoices = useMemo<MachineOption[]>(() => machineOptions.map((machine, index) => ({
    id: machineOptionId(machine, index),
    machine,
  })), [machineOptions]);
  const [name, setName] = useState(defaultName);
  const [parentPath, setParentPath] = useState(defaultParentPath);
  const [machineOption, setMachineOption] = useState(machineChoices[0]?.id ?? "local");
  const machineSelectRef = useRef<HTMLSelectElement | null>(null);
  const selectedChoice = machineChoices.find((choice) => choice.id === machineOption) ?? machineChoices[0];
  const selectedMachine = selectedChoice?.machine ?? machineOptions[0];
  const selectedMachineOptionId = selectedChoice?.id ?? machineChoices[0]?.id ?? "";
  const fullPath = joinDisplayPath(parentPath, name);
  const currentMachine = () => (
    machineChoices.find((choice) => choice.id === machineSelectRef.current?.value)?.machine ?? selectedMachine
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="grid w-full max-w-xl gap-4 rounded-lg border border-[rgba(148,163,184,0.20)] bg-[rgba(10,14,21,0.96)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]" role="dialog" aria-modal="true" aria-labelledby="create-folder-repo-title">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[rgba(94,234,212,0.24)] bg-[rgba(20,184,166,0.08)] text-[var(--accent-strong)]">{icon}</span> : null}
            <div className="grid min-w-0 gap-1">
              <p className="eyebrow">{eyebrow}</p>
              <h2 id="create-folder-repo-title" className="m-0 text-lg font-bold text-[var(--foreground)]">{title}</h2>
              {description ? <p className="m-0 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
            </div>
          </div>
          <button type="button" className="rounded-md border border-[rgba(148,163,184,0.18)] p-2 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          {nameLabel}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.50)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-[rgba(94,234,212,0.52)]"
          />
        </label>

        {machineOptions.length > 1 ? (
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Machine
            <select
              ref={machineSelectRef}
              value={selectedMachineOptionId}
              onChange={(event) => {
                setMachineOption(event.target.value);
                setParentPath(defaultParentPath);
              }}
              className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.50)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-[rgba(94,234,212,0.52)]"
            >
              {machineChoices.map(({ id, machine }) => <option key={id} value={id}>{machine.name}</option>)}
            </select>
          </label>
        ) : null}

        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          {pathLabel}
          <span className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={parentPath}
              onChange={(event) => setParentPath(event.target.value)}
              className="min-w-0 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(2,6,23,0.50)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-[rgba(94,234,212,0.52)]"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const browseMachine = currentMachine();
                if (!browseMachine || !onBrowseDirectory) return;
                setMachineOption(machineSelectRef.current?.value || selectedMachineOptionId);
                void onBrowseDirectory(browseMachine, (directory) => {
                  if (directory.path) setParentPath(directory.path);
                });
              }}
              disabled={!onBrowseDirectory || busy}
            >
              <FolderOpen aria-hidden="true" />
              Browse
            </Button>
          </span>
        </label>

        <div className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(2,6,23,0.34)] px-3 py-2">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Will create</p>
          <p className="m-0 break-words text-sm font-semibold leading-6 text-[var(--foreground)]">{fullPath}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={() => void onSubmit({ name: folderSlug(name, defaultName), parentPath, fullPath, machine: currentMachine() })} disabled={busy || !name.trim() || !parentPath.trim()}>
            {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {submitLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
