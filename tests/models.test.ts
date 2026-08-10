import { describe, expect, test } from "bun:test";

import type { AgentProviderDescription } from "@sand/extension-api";

import {
  providerConnectionValue,
  providerModelsValue,
} from "../extensions/workbench/controller/values.ts";

const remoteTraits = {
  reasoning: [
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
  ],
  defaultReasoning: "high",
  serviceTiers: [
    { id: "standard", label: "Standard" },
    { id: "fast", label: "Fast" },
  ],
  defaultServiceTier: "standard",
};

const localTraits = {
  reasoning: [],
  defaultReasoning: "",
  serviceTiers: [],
  defaultServiceTier: "",
};

const providers: AgentProviderDescription[] = [
  {
    id: "remote",
    name: "Remote",
    defaultModel: "remote-default",
    modelDefaults: remoteTraits,
    models: [{
      slug: "remote-default",
      name: "Remote Default",
      defaultFavorite: true,
      ...remoteTraits,
    }],
  },
  {
    id: "echo",
    name: "Echo",
    defaultModel: "local",
    modelDefaults: localTraits,
    models: [{ slug: "local", name: "Local", ...localTraits }],
  },
];

describe("provider model catalogs", () => {
  test("uses provider-owned model metadata", () => {
    const catalog = providerModelsValue(undefined, providers);

    expect(catalog.remote?.[0]).toMatchObject({
      slug: "remote-default",
      name: "Remote Default",
      favorite: true,
      defaultReasoning: "high",
      defaultServiceTier: "standard",
    });
    expect(catalog.echo?.[0]).toMatchObject({
      slug: "local",
      name: "Local",
      favorite: false,
      hidden: false,
    });
  });

  test("preserves preferences and appends newly declared models", () => {
    const catalog = providerModelsValue({
      remote: [
        { slug: "custom-b", favorite: false, hidden: true },
        { slug: "custom-a", favorite: true, hidden: false },
        { slug: "custom-b", favorite: true, hidden: false },
      ],
    }, providers);

    expect(catalog.remote?.map(({ slug, favorite, hidden }) => ({
      slug,
      favorite,
      hidden,
    }))).toEqual([
      { slug: "custom-b", favorite: false, hidden: true },
      { slug: "custom-a", favorite: true, hidden: false },
      { slug: "remote-default", favorite: true, hidden: false },
    ]);
    expect(catalog.remote?.[0]).toMatchObject(remoteTraits);
  });
});

describe("provider connections", () => {
  test("normalizes extension-owned status data", () => {
    expect(providerConnectionValue({
      available: true,
      label: "Ready",
      description: "Connected",
    })).toEqual({ available: true, label: "Ready", description: "Connected" });
    expect(providerConnectionValue({})).toEqual({
      available: false,
      label: "Unavailable",
      description: "No connection details are available.",
    });
  });
});
