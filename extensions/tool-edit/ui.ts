import { icon } from "@vaakx-dev/vrui";
import { SquarePen } from "lucide";

import { stringValue, type UiExtension } from "@sand/extension-api";
import { useWorkbench } from "sand:api/workbench";

const extension: UiExtension = {
  activate(context) {
    useWorkbench(context.apis).tools.register({
      name: "edit",
      label: "Edited file",
      renderIcon: (size) => icon(SquarePen, size),
      preview: (input) => stringValue(input.path),
    });
  },
};

export default extension;
