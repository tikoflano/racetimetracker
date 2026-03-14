import { ReactNode } from "react";
import { Button, Group } from "@mantine/core";

export interface ModalFooterProps {
  /** Optional content on the left (e.g. "More information" link). */
  left?: ReactNode;
  /** Label for the cancel/close button. Default: "Close" when no submit, "Cancel" when submit present. */
  cancelLabel?: string;
  /** Called when user cancels or closes. */
  onCancel: () => void;
  /** When true, only the primary button is shown (no Cancel). Use for "Save"-only footers. */
  onlySubmit?: boolean;
  /** Label for the primary action (e.g. "Save", "Create", "Invite"). When set, shows Cancel + primary (unless onlySubmit). */
  submitLabel?: string;
  /** Primary action handler. */
  onSubmit?: () => void;
  /** Disable the primary button. */
  submitDisabled?: boolean;
  /** Show loading state on the primary button. */
  submitLoading?: boolean;
  /** Button size. Default: "md". */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * Shared modal footer: Cancel/Close on the left, optional primary action on the right.
 * Use when the modal has a single close, or Cancel + primary (Save / Create / Invite, etc.).
 * For custom layouts (e.g. left-aligned link + Save), use the `left` prop.
 */
export function ModalFooter({
  left,
  cancelLabel,
  onCancel,
  onlySubmit = false,
  submitLabel,
  onSubmit,
  submitDisabled = false,
  submitLoading = false,
  size = "md",
}: ModalFooterProps) {
  const hasSubmit = Boolean(submitLabel && onSubmit);
  const showCancelButton = hasSubmit ? !onlySubmit : true;
  const label = cancelLabel ?? (hasSubmit ? "Cancel" : "Close");

  const buttons = (
    <>
      {showCancelButton && (
        <Button variant="subtle" size={size} onClick={onCancel}>
          {label}
        </Button>
      )}
      {hasSubmit && (
        <Button
          size={size}
          onClick={onSubmit}
          disabled={submitDisabled}
          loading={submitLoading}
        >
          {submitLabel}
        </Button>
      )}
    </>
  );

  if (left) {
    return (
      <Group justify="space-between" gap="xs" mt="xs">
        {left}
        <Group gap="xs" justify="flex-end">
          {buttons}
        </Group>
      </Group>
    );
  }

  return (
    <Group justify="flex-end" gap="xs" mt="xs">
      {buttons}
    </Group>
  );
}
