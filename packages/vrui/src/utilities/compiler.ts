import { BREAKPOINT } from "./scales";
import { resolveUtility } from "./rules";

export type CompiledUtility = {
  css: string;
  order: string;
  token: string;
};

const states: Record<string, string> = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  active: ":active",
  disabled: ":disabled",
  checked: ":checked",
  first: ":first-child",
  last: ":last-child",
};

function escapeClass(token: string): string {
  return token.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

function declarations(entries: readonly (readonly [string, string])[]): string {
  return entries.map(([property, value]) => `${property}:${value}`).join(";");
}

export function compileUtility(token: string): CompiledUtility | undefined {
  const parts = token.split(":");
  const utilityName = parts.pop()!;
  const utility = resolveUtility(utilityName);
  if (!utility) return;

  let selector = `.${escapeClass(token)}`;
  let breakpoint: keyof typeof BREAKPOINT | undefined;
  let dark = false;

  for (const variant of parts) {
    if (variant in BREAKPOINT) {
      if (breakpoint) return;
      breakpoint = variant as keyof typeof BREAKPOINT;
      continue;
    }
    if (variant === "dark") {
      dark = true;
      continue;
    }
    const suffix = states[variant];
    if (!suffix) return;
    selector += suffix;
  }

  if (dark) {
    selector += ":where([data-vrui-mode=\"dark\"], [data-vrui-mode=\"dark\"] *)";
  }

  let css = `${selector}{${declarations(utility.declarations)}}`;
  if (breakpoint) {
    css = `@media (min-width:${BREAKPOINT[breakpoint]}){${css}}`;
  }

  const breakpointOrder = breakpoint
    ? Object.keys(BREAKPOINT).indexOf(breakpoint) + 1
    : 0;
  return {
    css,
    order: `${breakpointOrder.toString().padStart(2, "0")}:${utility.order.toString().padStart(4, "0")}:${token}`,
    token,
  };
}
