import { button, derive, div, dynamicChild, show, span, stop } from "@vaakx-dev/vrui";

import type { AgentContextUsage } from "@sand/extension-api";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import { findModel } from "../../modelCatalog.ts";
import type { WorkbenchState } from "../../state.ts";

const Anchor = styled(div, { position: "relative", flex: "none" });

const UsageButton = styled(button, {
  width: "var(--control-height)",
  height: "var(--control-height)",
  flex: "0 0 var(--control-height)",
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  color: "var(--text)",
  cursor: "pointer",
  "&:hover, &[aria-expanded=true]": { background: "var(--surface)" },
});
const Ring = styled(span, {
  position: "relative",
  width: "var(--control-tiny)",
  height: "var(--control-tiny)",
  borderRadius: "50%",
  background: "conic-gradient(currentColor var(--context-usage), var(--elevated) 0)",
  "&::after": { content: '""', position: "absolute", inset: "var(--space-small)", borderRadius: "50%", background: "var(--surface)" },
});
const Heading = styled(div, { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-large)", color: "var(--text)", fontSize: "var(--font-small)", fontWeight: "var(--weight-semibold)" });
const Numbers = styled(span, { color: "var(--muted)", fontSize: "var(--font-caption)", fontWeight: 400, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" });
const Meter = styled(div, { height: "var(--space-small)", margin: "var(--space-large) 0 var(--space-medium)", overflow: "hidden", borderRadius: "var(--radius-compact)", background: "var(--elevated)" });
const MeterFill = styled(span, { display: "block", height: "100%", borderRadius: "inherit", background: "var(--muted)" });
const Total = styled(div, { display: "flex", justifyContent: "space-between", gap: "var(--space-large)", color: "var(--muted)", fontSize: "var(--font-caption)", fontVariantNumeric: "tabular-nums" });
const Note = styled(span, { display: "block", marginTop: "var(--space-large)", color: "var(--muted)", fontSize: "var(--font-caption)", lineHeight: "var(--line-body)" });

export function contextButton(state: WorkbenchState, ui: SandUi): HTMLElement {
  let closeTimer: number | undefined;
  const open = () => {
    window.clearTimeout(closeTimer);
    state.threads.contextOpen.set(true);
  };
  const close = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => state.threads.contextOpen.set(false), 100);
  };
  return dynamicChild(currentContext(state), (usage) => usage
    ? Anchor(
        {
          onMouseEnter: open,
          onMouseLeave: close,
          onMount: () => () => window.clearTimeout(closeTimer),
        },
        UsageButton(
          {
            type: "button",
            "aria-label": contextLabel(usage),
            "aria-controls": "context-usage-popover",
            "aria-expanded": state.threads.contextOpen,
            onPointerDown: stop,
            onClick: () => {
              state.modelPickerOpen.set(false);
              state.traitsOpen.set(false);
              open();
            },
          },
          Ring({ style: { "--context-usage": `${contextPercentage(usage)}%` } }),
        ),
        show(state.threads.contextOpen, () => contextPopover(state, ui)),
      )
    : span({ hidden: true }));
}

export function contextPopover(state: WorkbenchState, ui: SandUi): HTMLElement {
  return dynamicChild(currentContext(state), (usage) => usage
    ? ui.popover(
        { width: 256, align: "end", padding: ui.tokens.space.section, onDismiss: () => state.threads.contextOpen.set(false) },
        div(
          { id: "context-usage-popover" },
          Heading(
            {},
            span("Context Window"),
            Numbers({}, `${contextPercentage(usage)}% · ${formatTokens(usage.usedTokens)}/${formatTokens(usage.maxTokens)}`),
          ),
          Meter({}, MeterFill({ style: { width: `${contextPercentage(usage)}%` } })),
          Total({}, span("Total processed"), span(formatTokens(usage.processedTokens))),
          Note({}, "Usage updates after each completed response."),
        ),
      )
    : div({ hidden: true }));
}

function currentContext(state: WorkbenchState) {
  return derive<AgentContextUsage | null>(() => {
    const usage = state.threads.contextUsage.get();
    if (usage) return usage;
    const contextWindow = findModel(
      state.providerModels.get(),
      state.provider.get(),
      state.model.get(),
    )?.contextWindow;
    return contextWindow
      ? { usedTokens: 0, maxTokens: contextWindow, processedTokens: 0 }
      : null;
  });
}

export function contextPercentage(usage: AgentContextUsage): number {
  if (usage.maxTokens <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(usage.usedTokens / usage.maxTokens * 100)));
}

export function formatTokens(value: number): string {
  if (value < 1_000) return String(Math.round(value));
  if (value < 1_000_000) return `${compact(value / 1_000)}k`;
  return `${compact(value / 1_000_000)}m`;
}

function contextLabel(usage: AgentContextUsage): string {
  return `Context window: ${contextPercentage(usage)}% used`;
}

function compact(value: number): string {
  const digits = value >= 10 ? 0 : 1;
  return value.toFixed(digits).replace(/\.0$/u, "");
}
