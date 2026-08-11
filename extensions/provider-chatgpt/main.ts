import { join } from "node:path";

import type { HostExtension } from "@sand/extension-api";

import { ChatGptAuth } from "./auth.ts";
import { CHATGPT_COMMANDS } from "./presentation.ts";
import { ChatGptProvider } from "./provider.ts";

const authInstances = new Map<string, ChatGptAuth>();

const extension: HostExtension = {
  activate(context) {
    const path = process.env.SAND_CHATGPT_AUTH || join(context.home, "auth", "chatgpt.json");
    const auth = authInstance(path);

    context.commands.register(CHATGPT_COMMANDS.status, () => auth.status());
    context.commands.register(CHATGPT_COMMANDS.connect, () => auth.login());
    context.commands.register(CHATGPT_COMMANDS.disconnect, () => auth.logout());
    context.providers.register(new ChatGptProvider(auth));
  },
};

function authInstance(path: string): ChatGptAuth {
  let auth = authInstances.get(path);
  if (!auth) {
    auth = new ChatGptAuth(path);
    authInstances.set(path, auth);
  }
  return auth;
}

export default extension;
