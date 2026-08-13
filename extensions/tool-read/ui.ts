import { icon } from "@vaakx-dev/vrui";
import { Eye } from "lucide";

import { stringValue, type UiExtension } from "@sand/extension-api";
import { useWorkbench } from "sand:api/workbench";

const extension: UiExtension = {
  activate(context) {
    useWorkbench(context.apis).tools.register({
      name: "read",
      label: "Read file",
      renderIcon: (size) => icon(Eye, size),
      preview: (input) => stringValue(input.path),
    });
  },
};

export default extension;
