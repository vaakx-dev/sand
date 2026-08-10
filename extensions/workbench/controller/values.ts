import type { JsonValue } from "@sand/extension-api";

import {
  CHATGPT_MODELS,
  type AppearanceMode,
  type ProviderDescription,
  type ProviderModel,
  type ProviderModels,
  type ReasoningEffort,
  type ServiceTier,
} from "../models.ts";

export function appearanceValue(value: JsonValue | undefined): AppearanceMode {
  return value === "light" || value === "dark" ? value : "system";
}

export function reasoningValue(
  value: JsonValue | undefined,
  fallback: ReasoningEffort = "high",
): ReasoningEffort {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh" || value === "max" || value === "ultra"
    ? value
    : fallback;
}

export function serviceTierValue(value: JsonValue | undefined): ServiceTier {
  return value === "fast" ? "fast" : "standard";
}

export function providerModelsValue(
  value: JsonValue | undefined,
  providers: ProviderDescription[],
): ProviderModels {
  const stored = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  return Object.fromEntries(providers.map((provider) => {
    const fallback = provider.id === "chatgpt" ? [...CHATGPT_MODELS] : [provider.defaultModel];
    const storedModels = stored[provider.id];
    const entries = Array.isArray(storedModels)
      ? storedModels.flatMap((item) => modelValue(item) ?? [])
      : fallback.filter(Boolean).map((slug, index) => ({
          slug,
          favorite: provider.id === "chatgpt" && index < 2,
          hidden: false,
        }));
    return [provider.id, uniqueModels(entries)];
  }));
}

function modelValue(value: JsonValue): ProviderModel | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  if (!slug) return null;
  return {
    slug,
    favorite: value.favorite === true,
    hidden: value.hidden === true,
  };
}

function uniqueModels(models: ProviderModel[]): ProviderModel[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (seen.has(model.slug)) return false;
    seen.add(model.slug);
    return true;
  });
}
