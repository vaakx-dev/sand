import { join } from "node:path";

import type { HostExtension } from "@sand/extension-api";

import { ChatGptAuth } from "./auth.ts";
import { ChatGptProvider } from "./provider.ts";

const extension: HostExtension = {
  activate(context) {
    const path = process.env.SAND_CHATGPT_AUTH || join(context.config, "auth", "chatgpt.json");
    const auth = new ChatGptAuth(path);

    context.commands.register("chatgpt.auth.status", () => auth.status());
    context.commands.register("chatgpt.auth.login", () => auth.login());
    context.commands.register("chatgpt.auth.logout", () => auth.logout());
    context.providers.register(new ChatGptProvider(auth));
  },
};

export default extension;
