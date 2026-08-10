import { icon } from "@vaakx-dev/vrui";
import { Globe2 } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { browserView } from "./view.ts";

const extension: UiExtension = {
  activate(context) {
    context.ui.surfaces.register({
      id: "browser",
      label: "Browser",
      description: "Open a local app or URL.",
      order: 10,
      multiple: true,
      renderIcon: (size) => icon(Globe2, size),
      render: browserView,
    });
    context.ui.commands.register({
      id: "browser.show",
      label: "View: Browser",
      run: () => context.ui.surfaces.open("browser"),
    });
  },
};

export default extension;
