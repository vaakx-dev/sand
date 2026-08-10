import { describe, expect, test } from "bun:test";

import { providerModelsValue } from "../extensions/workbench/controller/values.ts";

const providers = [
  { id: "chatgpt", name: "ChatGPT", defaultModel: "gpt-default" },
  { id: "echo", name: "Echo", defaultModel: "local" },
];

describe("provider model catalogs", () => {
  test("creates provider-specific defaults", () => {
    const catalog = providerModelsValue(undefined, providers);

    expect(catalog.chatgpt?.map((model) => model.slug)).toContain("gpt-5.6-sol");
    expect(catalog.echo).toEqual([{ slug: "local", favorite: false, hidden: false }]);
  });

  test("preserves order, favorites, hidden state, and unique slugs", () => {
    const catalog = providerModelsValue({
      chatgpt: [
        { slug: "custom-b", favorite: false, hidden: true },
        { slug: "custom-a", favorite: true, hidden: false },
        { slug: "custom-b", favorite: true, hidden: false },
      ],
    }, providers);

    expect(catalog.chatgpt).toEqual([
      { slug: "custom-b", favorite: false, hidden: true },
      { slug: "custom-a", favorite: true, hidden: false },
    ]);
  });
});
