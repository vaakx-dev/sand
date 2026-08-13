import { css, keyframes } from "@emotion/css";

import type { Value } from "../api.ts";

const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

export const busyIcon = css({
  "&[aria-busy=true] > .vrui-icon": {
    animation: `${spin} 700ms linear infinite`,
  },
});

export function busy(value: Value<boolean> | undefined): boolean | (() => boolean) | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "object" && value !== null && "get" in value) return () => value.get();
  return value;
}
