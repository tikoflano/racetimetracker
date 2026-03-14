import type { BadgeProps } from "@mantine/core";

/** Styles to disable Badge truncation so full text is visible. Use for badges that must show full text (e.g. role names, scope names). */
export const BADGE_FULL_STYLES: BadgeProps["styles"] = {
  root: { overflow: "visible", minWidth: "max-content" },
  label: { overflow: "visible", textOverflow: "unset" },
};
