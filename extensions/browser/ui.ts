import { icon } from "@vaakx-dev/vrui";
import { Globe2 } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { useUi } from "sand:api/ui";
import { useWorkbench } from "sand:api/workbench";
import { browserView } from "./view.ts";

const extension: UiExtension = {
  activate(context) {
    const ui = useUi(context.apis);
    const workbench = useWorkbench(context.apis);
    workbench.surfaces.register({
      id: "browser",
      label: "Browser",
      description: "Open a local app or URL.",
      order: 10,
      multiple: true,
      renderIcon: (size) => icon(Globe2, size),
      render: (instance) => browserView(ui, instance),
    });
    workbench.commands.register({
      id: "browser.show",
      label: "View: Browser",
      run: () => workbench.surfaces.open("browser"),
    });
  },
};

export default extension;
