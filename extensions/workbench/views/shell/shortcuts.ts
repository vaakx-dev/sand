import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { groupThreads } from "../sidebar/threadGroups.ts";

export function globalKeyDown(
  event: KeyboardEvent,
  controller: WorkbenchController,
  state: WorkbenchState,
): void {
  const modifier = event.ctrlKey || event.metaKey;
  if (
    modifier
    && !event.shiftKey
    && !state.modelPickerOpen.get()
    && /^[1-9]$/.test(event.key)
  ) {
    const session = orderedSessions(state)[Number(event.key) - 1];
    if (session) {
      event.preventDefault();
      void controller.agent.openSession(session.id);
    }
    return;
  }
  const command = state.commands.get().find((item) =>
    item.keybinding && matchesKeybinding(event, item.keybinding)
  );
  if (command) {
    event.preventDefault();
    void controller.executeCommand(command.id);
    return;
  }
  if (event.key === "Escape") closeOverlays(state);
}

function matchesKeybinding(event: KeyboardEvent, keybinding: string): boolean {
  const parts = keybinding.toLowerCase().split("+");
  const key = parts.pop();
  if (!key) return false;
  return (event.ctrlKey || event.metaKey) === parts.includes("ctrl")
    && event.shiftKey === parts.includes("shift")
    && event.altKey === parts.includes("alt")
    && event.key.toLowerCase() === key;
}

function closeOverlays(state: WorkbenchState): void {
  state.openMenuOpen.set(false);
  state.modelPickerOpen.set(false);
  state.traitsOpen.set(false);
  state.projectMenuOpen.set(false);
  state.projectPickerOpen.set(false);
  state.projectSourceOpen.set(false);
  state.threadMenu.set(null);
  state.threadSnoozeOpen.set(false);
  state.threadPreview.set(null);
  state.threadRename.set(null);
}

function orderedSessions(state: WorkbenchState) {
  const groups = groupThreads(state.sessions.get(), {
    query: "",
    now: Date.now(),
    autoSettleAfterDays: state.autoSettleDays.get(),
  });
  return [...groups.pinned, ...groups.active, ...groups.snoozed, ...groups.settled];
}
