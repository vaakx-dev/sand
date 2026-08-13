import { icon } from "@vaakx-dev/vrui";
import { FilePlus2 } from "lucide";

import { stringValue, type UiExtension } from "@sand/extension-api";
import { useWorkbench } from "sand:api/workbench";

const extension: UiExtension = {
  activate(context) {
    useWorkbench(context.apis).tools.register({
      name: "write",
      label: "Wrote file",
      renderIcon: (size) => icon(FilePlus2, size),
      preview: (input) => stringValue(input.path),
    });
  },
};

export default extension;
