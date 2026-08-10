import { icon } from "@vaakx-dev/vrui";
import { SquarePen } from "lucide";

import { stringValue, type UiExtension } from "@sand/extension-api";

const extension: UiExtension = {
  activate(context) {
    context.ui.tools.register({
      name: "edit",
      label: "Edited file",
      renderIcon: (size) => icon(SquarePen, size),
      preview: (input) => stringValue(input.path),
    });
  },
};

export default extension;
