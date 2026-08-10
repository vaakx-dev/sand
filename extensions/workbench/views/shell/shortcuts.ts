import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { group } from "../sidebar/threads/groups.ts";

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
    const thread = orderedThreads(state)[Number(event.key) - 1];
    if (thread) {
      event.preventDefault();
      void controller.threads.open(thread.id);
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
  state.modelPickerOpen.set(false);
  state.traitsOpen.set(false);
  state.threads.menu.set(null);
  state.threads.snoozeOpen.set(false);
  state.threads.preview.set(null);
  state.threads.rename.set(null);
}

function orderedThreads(state: WorkbenchState) {
  const groups = group(state.threads.items.get(), {
    query: "",
    now: Date.now(),
    autoSettleAfterDays: state.threads.autoSettleDays.get(),
  });
  return [...groups.pinned, ...groups.active, ...groups.snoozed, ...groups.settled];
}
