import type { ReasoningEffort } from "../../models.ts";

export function reasoningLabel(value: ReasoningEffort): string {
  return value === "xhigh" ? "Extra High" : value[0]!.toUpperCase() + value.slice(1);
}
