"use client";

import type { ReactNode } from "react";
import { Check, LoaderCircle, Pencil } from "lucide-react";
import { CloseIconButton } from "@/components/ui/close-icon-button";

type InlineRenameRenderArgs = {
  value: string;
  editButton: ReactNode;
};

type InlineRenameControlProps = {
  value: string;
  draft: string;
  editing: boolean;
  onDraftChange: (value: string) => void;
  onStartEditing: () => void;
  onCancel: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  inputId?: string;
  inputAriaLabel: string;
  editAriaLabel: string;
  saveAriaLabel: string;
  cancelAriaLabel: string;
  placeholder?: string;
  busy?: boolean;
  disabled?: boolean;
  displayClassName?: string;
  formClassName?: string;
  inputClassName?: string;
  editButtonClassName?: string;
  saveButtonClassName?: string;
  renderDisplay?: (args: InlineRenameRenderArgs) => ReactNode;
};

export function InlineRenameControl({
  value,
  draft,
  editing,
  onDraftChange,
  onStartEditing,
  onCancel,
  onSubmit,
  inputId,
  inputAriaLabel,
  editAriaLabel,
  saveAriaLabel,
  cancelAriaLabel,
  placeholder,
  busy = false,
  disabled = false,
  displayClassName,
  formClassName,
  inputClassName,
  editButtonClassName,
  saveButtonClassName,
  renderDisplay,
}: InlineRenameControlProps) {
  const trimmedDraft = draft.trim();
  const canSubmit = Boolean(trimmedDraft) && !busy && !disabled;
  const editButton = (
    <button
      type="button"
      aria-label={editAriaLabel}
      className={editButtonClassName}
      disabled={disabled || busy}
      onClick={onStartEditing}
    >
      <Pencil aria-hidden="true" />
    </button>
  );

  if (editing) {
    return (
      <form
        className={formClassName}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          void onSubmit(trimmedDraft);
        }}
      >
        <input
          id={inputId}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          aria-label={inputAriaLabel}
          placeholder={placeholder}
          className={inputClassName}
          disabled={disabled || busy}
          autoFocus
        />
        <button type="submit" aria-label={saveAriaLabel} className={saveButtonClassName} disabled={!canSubmit}>
          {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
        </button>
        <CloseIconButton
          size="sm"
          type="button"
          aria-label={cancelAriaLabel}
          onClick={onCancel}
          disabled={busy}
        />
      </form>
    );
  }

  if (renderDisplay) {
    return <>{renderDisplay({ value, editButton })}</>;
  }

  return (
    <div className={displayClassName}>
      <span>{value}</span>
      {editButton}
    </div>
  );
}
