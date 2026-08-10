import {
  objectValue,
  stringValue,
  type AgentProviderConnectionState,
  type JsonValue,
} from "@sand/extension-api";

import {
  type AppearanceMode,
  type ProviderDescription,
  type ProviderModels,
} from "../models.ts";
import { providerModel } from "../modelCatalog.ts";

export function appearanceValue(value: JsonValue | undefined): AppearanceMode {
  return value === "light" || value === "dark" ? value : "system";
}

export function providerConnectionValue(value: JsonValue): AgentProviderConnectionState {
  const state = objectValue(value);
  const available = state.available === true;
  return {
    available,
    label: stringValue(state.label, available ? "Available" : "Unavailable"),
    description: stringValue(state.description, "No connection details are available."),
  };
}

export function providerModelsValue(
  value: JsonValue | undefined,
  providers: ProviderDescription[],
): ProviderModels {
  const stored = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  return Object.fromEntries(providers.map((provider) => {
    const storedModels = stored[provider.id];
    const preferences = Array.isArray(storedModels)
      ? uniquePreferences(storedModels.flatMap((item) => preferenceValue(item) ?? []))
      : [];
    const ordered = preferences.length > 0
      ? [
          ...preferences,
          ...provider.models
            .filter((model) => !preferences.some((item) => item.slug === model.slug))
            .map((model) => ({
              slug: model.slug,
              favorite: model.defaultFavorite === true,
              hidden: false,
            })),
        ]
      : provider.models.map((model) => ({
          slug: model.slug,
          favorite: model.defaultFavorite === true,
          hidden: false,
        }));
    return [provider.id, ordered.map((preference) => providerModel(
      provider,
      preference.slug,
      preference.favorite,
      preference.hidden,
    ))];
  }));
}

function preferenceValue(value: JsonValue): ModelPreference | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  if (!slug) return null;
  return {
    slug,
    favorite: value.favorite === true,
    hidden: value.hidden === true,
  };
}

function uniquePreferences(models: ModelPreference[]): ModelPreference[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (seen.has(model.slug)) return false;
    seen.add(model.slug);
    return true;
  });
}

interface ModelPreference {
  slug: string;
  favorite: boolean;
  hidden: boolean;
}
