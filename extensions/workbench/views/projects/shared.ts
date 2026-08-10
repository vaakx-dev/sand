import { div, icon, span } from "@vaakx-dev/vrui";
import { ArrowDown, ArrowUp } from "lucide";

export function modalFooter(): HTMLElement {
  return div(
    { class: "project-modal-footer" },
    span({ class: "keybinding" }, icon(ArrowUp, 10)),
    span({ class: "keybinding" }, icon(ArrowDown, 10)),
    span("Navigate"),
    span({ class: "keybinding" }, "Enter"),
    span("Select"),
    span({ class: "keybinding" }, "Backspace"),
    span("Back"),
    span({ class: "keybinding" }, "Esc"),
    span("Close"),
  );
}
