import { derive, div, dynamicChild, icon, span } from "@vaakx-dev/vrui";
import { Folder } from "lucide";

import { threadLastActivityAt, threadStatus } from "@sand/extension-api";

import { styled } from "sand:api/ui";
import { tokens } from "sand:api/ui";
import { findProvider } from "../../../modelCatalog.ts";
import type { WorkbenchState } from "../../../state.ts";
import { projectName, relativeTime } from "../../format.ts";
import { providerIcon } from "../../shared/providerIcon.ts";
import { modelLabel, previewLabel } from "./status.ts";

const Card = styled(div, {
  position: "fixed",
  zIndex: "var(--z-preview)",
  width: 224,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-medium)",
  padding: "var(--space-large)",
  border: "1px solid var(--outline)",
  borderRadius: "var(--row-radius)",
  color: "var(--muted)",
  background: "var(--panel)",
  boxShadow: "0 18px 55px #000a",
  pointerEvents: "none",
});
const Title = styled(span, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)", fontWeight: "var(--weight-semibold)" });
const Line = styled(div, { display: "flex", alignItems: "center", gap: "var(--space-medium)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--font-caption)" });
const Status = styled(div, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-medium)",
  paddingTop: "var(--space-medium)",
  borderTop: "1px solid var(--border)",
  color: "var(--muted)",
  fontSize: "var(--font-caption)",
  "&[data-status=working]": { color: "var(--accent)" },
  "&[data-status=approval], &[data-status=input]": { color: "var(--warning)" },
  "&[data-status=failed]": { color: "var(--danger)" },
  "&[data-status=monitoring]": { color: "var(--accent)" },
});

export function hoverCard(state: WorkbenchState): HTMLElement {
  return dynamicChild(
    derive(() => state.sidebarOpen.get() && state.activity.get() === "threads" ? state.threads.preview.get() : null),
    (thread) => thread
      ? Card(
          {
            style: {
              left: state.sidebarWidth.map((width) => `${width + tokens.space.medium}px`),
              top: state.threads.previewTop.map((top) => `${top}px`),
            },
            onMount: (element) => {
              const inset = tokens.space.medium;
              const top = Math.max(
                inset,
                Math.min(state.threads.previewTop.get(), window.innerHeight - element.offsetHeight - inset),
              );
              state.threads.previewTop.set(top);
            },
          },
          Title({}, thread.title),
          Line({}, icon(Folder, tokens.size.iconTiny), state.root.map(projectName)),
          Line({}, providerIcon(findProvider(state.providers.get(), thread.provider), tokens.size.iconTiny), modelLabel(state, thread)),
          Status(
            { "data-status": threadStatus(thread) },
            previewLabel(thread, state.threads.autoSettleDays.get()),
            span(relativeTime(threadLastActivityAt(thread))),
          ),
        )
      : div({ hidden: true }),
  );
}
