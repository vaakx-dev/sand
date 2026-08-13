import { expect, test } from "bun:test";

import type { AgentProviderDescription } from "@sand/extension-api";

import type { ProviderContribution } from "./api.ts";
import { providerCatalog } from "./providerCatalog.ts";

const connection: ProviderContribution["connection"] = {
  connectLabel: "Connect",
  connectingLabel: "Connecting…",
  disconnectLabel: "Disconnect",
  status: async () => ({ available: false, label: "Disconnected", description: "" }),
  connect: async () => {},
  disconnect: async () => {},
};

test("keeps an installed provider visible while disconnected", () => {
  const providers = providerCatalog([{
    id: "codex",
    name: "Codex CLI",
    description: "Local Codex",
    connection,
  }], []);

  expect(providers).toMatchObject([{
    id: "codex",
    name: "Codex CLI",
    defaultModel: "",
    models: [],
    connection,
  }]);
});

test("merges live models into the installed provider", () => {
  const live: AgentProviderDescription = {
    id: "codex",
    name: "Codex",
    defaultModel: "gpt-test",
    modelDefaults: {
      reasoning: [{ id: "high", label: "High" }],
      defaultReasoning: "high",
      serviceTiers: [],
      defaultServiceTier: "",
    },
    models: [{
      slug: "gpt-test",
      name: "GPT Test",
      reasoning: [{ id: "high", label: "High" }],
      defaultReasoning: "high",
      serviceTiers: [],
      defaultServiceTier: "",
    }],
  };

  const [provider] = providerCatalog([{
    id: "codex",
    name: "Codex CLI",
    description: "Local Codex",
    connection,
  }], [live]);

  expect(provider?.defaultModel).toBe("gpt-test");
  expect(provider?.models[0]).toMatchObject({
    slug: "gpt-test",
    reasoning: [{ id: "high", label: "High" }],
  });
});
