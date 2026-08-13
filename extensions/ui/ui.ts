import type { UiExtension } from "@sand/extension-api";

import { UI_API } from "./api.ts";
import { createUi } from "./create.ts";

const extension: UiExtension = {
  activate(context) {
    context.apis.provide(UI_API, createUi());
  },
};

export default extension;
