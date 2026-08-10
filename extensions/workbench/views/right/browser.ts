import { button, div, form, input } from "@vaakx-dev/vrui";

import type { BrowserTab } from "../../models.ts";
import { requestBrowserNavigation } from "../../panel.ts";
import type { WorkbenchState } from "../../state.ts";
import { nativeBrowser } from "./nativeBrowser.ts";

export function browserView(state: WorkbenchState, tab: BrowserTab): HTMLElement {
  return div(
    { class: "browser-view" },
    form(
      {
        class: "browser-bar",
        onSubmit: (event) => {
          event.preventDefault();
          requestBrowserNavigation(tab);
        },
      },
      input({
        class: "browser-address",
        bindValue: tab.input,
        "aria-label": "Browser address",
        spellcheck: false,
      }),
      button({ class: "secondary-button", type: "submit" }, "Go"),
    ),
    nativeBrowser(state, tab),
  );
}
