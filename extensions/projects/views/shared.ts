import { icon } from "@vaakx-dev/vrui";
import { ArrowDown, ArrowUp } from "lucide";

import type { SandUi } from "sand:api/ui";

export function modalFooter(ui: SandUi): HTMLElement {
  return ui.shortcutBar([
    { keys: [icon(ArrowUp, ui.tokens.size.iconTiny), icon(ArrowDown, ui.tokens.size.iconTiny)], label: "Navigate" },
    { keys: "Enter", label: "Select" },
    { keys: "Backspace", label: "Back" },
    { keys: "Esc", label: "Close" },
  ]);
}
