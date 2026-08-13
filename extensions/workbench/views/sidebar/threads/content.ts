import { div, icon, span, stopThen, type Sig } from "@vaakx-dev/vrui";
import { AlarmClockOff, Check, Clock3, Folder, MessageSquare, Pin, Undo2 } from "lucide";

import {
  canSettleThread,
  canSnoozeThread,
  settledTimestamp,
  snoozeWakeLabel,
  threadStatus,
  type AgentThreadSummary,
} from "@sand/extension-api";
import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { WorkbenchController } from "../../../controller.ts";
import { findProvider } from "../../../modelCatalog.ts";
import type { WorkbenchState } from "../../../state.ts";
import { projectName, relativeTime } from "../../format.ts";
import { providerIcon } from "../../shared/providerIcon.ts";
import { rowLabel } from "./status.ts";

const Content = styled(div, { minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-small)" });
const Top = styled(div, { height: "var(--icon-tiny)", display: "flex", alignItems: "center", gap: "var(--space-small)", color: "var(--muted)" });
const Project = styled(span, { minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--font-caption)" });
const Title = styled(span, { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)", fontSize: "var(--font-label)", fontWeight: "var(--weight-semibold)" });
const SlimTitle = styled(Title, { flex: 1, color: "inherit", fontWeight: "var(--weight-medium)" });
const Meta = styled(div, { minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", color: "var(--muted)" });
const Status = styled(span, {
  minWidth: 0,
  marginLeft: "auto",
  overflow: "hidden",
  color: "var(--muted)",
  fontSize: "var(--font-caption)",
  fontWeight: "var(--weight-semibold)",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "&[data-status=working]": { color: "var(--accent)" },
  "&[data-status=approval], &[data-status=input]": { color: "var(--warning)" },
  "&[data-status=failed]": { color: "var(--danger)" },
  "&[data-status=monitoring]": { color: "var(--accent)" },
});
const RowActions = styled(span, {
  position: "absolute",
  top: 0,
  right: 0,
  height: "var(--control-height)",
  display: "none",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "var(--space-compact)",
  background: "var(--surface)",
  "> button:not(:disabled):hover": { background: "transparent" },
});
const Slim = styled(div, { minWidth: 0, display: "flex", alignItems: "center", gap: "var(--space-small)", color: "var(--muted)" });
const Time = styled(span, { minWidth: 0, marginLeft: "auto", overflow: "hidden", fontSize: "var(--font-caption)", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export function slimContent(
  controller: WorkbenchController,
  ui: SandUi,
  thread: AgentThreadSummary,
  section: "snoozed" | "settled",
  clock: Sig<number>,
): HTMLElement {
  return Slim(
    { "data-role": "slim" },
    icon(MessageSquare, ui.tokens.size.iconTiny),
    SlimTitle({ "data-role": "title" }, thread.title),
    Time(
      { "data-role": "time" },
      clock.map((now) => section === "snoozed" && thread.snoozedUntil
        ? snoozeWakeLabel(thread.snoozedUntil, now)
        : relativeTime(settledTimestamp(thread), now)),
    ),
    RowActions(
      { "data-role": "actions" },
      ui.iconButton({
        label: section === "snoozed" ? "Wake thread now" : "Un-settle thread",
        variant: "dense",
        renderIcon: (size) => icon(section === "snoozed" ? AlarmClockOff : Undo2, size),
        onClick: stopThen(() => section === "snoozed"
          ? void controller.threads.snooze(thread.id)
          : void controller.threads.settle(thread.id, false)),
      }),
    ),
  );
}

export function fullContent(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
  thread: AgentThreadSummary,
  section: "pinned" | "active",
  clock: Sig<number>,
): HTMLElement {
  const now = Date.now();
  const canSettle = canSettleThread(thread, now);
  const canSnooze = canSnoozeThread(thread, now);
  return Content(
    {},
    Top(
      {},
      icon(Folder, ui.tokens.size.iconTiny),
      Project({}, state.root.map(projectName)),
      Status(
        {
          "data-role": "status",
          "data-status": threadStatus(thread),
          "data-actionable": section === "pinned" || canSettle || canSnooze,
        },
        clock.map((value) => rowLabel(thread, value)),
      ),
    ),
    Title({ "data-role": "title" }, thread.title),
    Meta({}, providerIcon(findProvider(state.providers.get(), thread.provider), ui.tokens.size.iconTiny)),
    section === "pinned" || canSettle || canSnooze
      ? RowActions(
          { "data-role": "actions" },
          section === "pinned"
            ? ui.iconButton({
                label: "Unpin thread",
                variant: "dense",
                renderIcon: (size) => icon(Pin, size),
                onClick: stopThen(() => void controller.threads.pin(thread.id, false)),
              })
            : null,
          canSnooze
            ? ui.iconButton({
                label: "Snooze thread",
                variant: "dense",
                renderIcon: (size) => icon(Clock3, size),
                onClick: (event) => {
                  event.stopPropagation();
                  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
                  state.threads.preview.set(null);
                  state.threads.menu.set({
                    kind: "snooze",
                    thread,
                    x: bounds.right + ui.tokens.space.compact,
                    y: bounds.top,
                  });
                },
              })
            : null,
          canSettle
            ? ui.iconButton({
                label: "Settle thread",
                variant: "dense",
                renderIcon: (size) => icon(Check, size),
                onClick: stopThen(() => void controller.threads.settle(thread.id, true)),
              })
            : null,
        )
      : null,
  );
}
