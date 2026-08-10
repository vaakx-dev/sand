import { derive, div, dynamicChild, icon, span } from "@vaakx-dev/vrui";
import { Folder } from "lucide";

import { threadLastActivityAt, threadStatus } from "@sand/extension-api";

import { findProvider } from "../../../modelCatalog.ts";
import type { WorkbenchState } from "../../../state.ts";
import { projectName, relativeTime } from "../../format.ts";
import { providerIcon } from "../../shared/providerIcon.ts";
import { modelLabel, previewLabel } from "./status.ts";

export function hoverCard(state: WorkbenchState): HTMLElement {
  return dynamicChild(
    derive(() => state.sidebarOpen.get() && state.activity.get() === "threads"
      ? state.threads.preview.get()
      : null),
    (thread) => thread
      ? div(
          {
            class: "thread-hover-card",
            style: {
              left: state.sidebarWidth.map((width) => `${width + 8}px`),
              top: state.threads.previewTop.map((top) => `${top}px`),
            },
          },
          span({ class: "thread-hover-title" }, thread.title),
          div({ class: "thread-hover-line" }, icon(Folder, 12), state.root.map(projectName)),
          div(
            { class: "thread-hover-line" },
            providerIcon(findProvider(state.providers.get(), thread.provider), 12),
            modelLabel(state, thread),
          ),
          div(
            { class: ["thread-hover-status", threadStatus(thread)] },
            previewLabel(thread, state.threads.autoSettleDays.get()),
            span(relativeTime(threadLastActivityAt(thread))),
          ),
        )
      : div({ hidden: true }),
  );
}
