import type { AgentProviderOption } from "@sand/extension-api";

import type {
  ProviderDescription,
  ProviderModel,
  ProviderModels,
} from "./models.ts";

export function findProvider(
  providers: ProviderDescription[],
  id: string,
): ProviderDescription | undefined {
  return providers.find((provider) => provider.id === id);
}

export function findModel(
  catalog: ProviderModels,
  provider: string,
  slug: string,
): ProviderModel | undefined {
  return catalog[provider]?.find((model) => model.slug === slug);
}

export function visibleModels(catalog: ProviderModels, provider: string): ProviderModel[] {
  return (catalog[provider] ?? []).filter((model) => !model.hidden);
}

export function firstModel(
  catalog: ProviderModels,
  provider: ProviderDescription | undefined,
): ProviderModel | undefined {
  if (!provider) return undefined;
  const models = catalog[provider.id] ?? [];
  return models.find((model) => !model.hidden)
    ?? models.find((model) => model.slug === provider.defaultModel)
    ?? models[0];
}

export function optionLabel(options: AgentProviderOption[], id: string): string {
  return options.find((option) => option.id === id)?.label || id;
}

export function modelName(model: ProviderModel | undefined, slug: string): string {
  return model?.name || slug;
}

export function providerModel(
  provider: ProviderDescription,
  slug: string,
  favorite = false,
  hidden = false,
): ProviderModel {
  const declared = provider.models.find((model) => model.slug === slug);
  return {
    slug,
    name: declared?.name || inferredModelName(slug),
    contextWindow: declared?.contextWindow,
    reasoning: declared?.reasoning ?? provider.modelDefaults.reasoning,
    defaultReasoning: declared?.defaultReasoning ?? provider.modelDefaults.defaultReasoning,
    serviceTiers: declared?.serviceTiers ?? provider.modelDefaults.serviceTiers,
    defaultServiceTier: declared?.defaultServiceTier
      ?? provider.modelDefaults.defaultServiceTier,
    favorite,
    hidden,
  };
}

function inferredModelName(slug: string): string {
  return slug;
}
