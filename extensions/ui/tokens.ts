import type { UiTokens } from "./api.ts";

export const tokens: UiTokens = {
  layout: {
    content: 768,
    copy: 672,
  },
  space: {
    compact: 2,
    small: 4,
    medium: 8,
    large: 12,
    section: 16,
    content: 24,
    page: 32,
  },
  size: {
    indicator: 6,
    iconTiny: 12,
    iconCompact: 14,
    icon: 16,
    controlTiny: 20,
    controlCompact: 24,
    control: 28,
    controlLarge: 32,
    header: 40,
    headerLarge: 48,
    setting: 64,
  },
  radius: {
    compact: 4,
    control: 6,
    row: 8,
    surface: 10,
    dialog: 12,
    round: 999,
  },
  font: {
    caption: 10,
    small: 11,
    label: 12,
    body: 13,
    content: 14,
    title: 20,
  },
  weight: {
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  line: {
    body: 1.5,
    content: 1.6,
  },
};
