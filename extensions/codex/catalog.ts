import type { RpcPeer } from "./rpc.ts";
import { array, object, text } from "./protocol.ts";

export const PROVIDER_META = "sand.app/provider";

export interface ProviderOption {
  id: string;
  label: string;
}

export interface ProviderModel {
  slug: string;
  name: string;
  reasoning: ProviderOption[];
  defaultReasoning: string;
  serviceTiers: ProviderOption[];
  defaultServiceTier: string;
  defaultFavorite?: boolean;
}

export interface ProviderCatalog {
  defaultModel: string;
  modelDefaults: {
    reasoning: ProviderOption[];
    defaultReasoning: string;
    serviceTiers: ProviderOption[];
    defaultServiceTier: string;
  };
  models: ProviderModel[];
}

export interface SessionConfiguration {
  model: string;
  reasoning: string;
  serviceTier: string;
}

const STANDARD_SERVICE_TIER = "standard";

interface DiscoveredModel extends ProviderModel {
  isDefault: boolean;
}

export async function loadCatalog(codex: RpcPeer): Promise<ProviderCatalog> {
  const discovered: DiscoveredModel[] = [];
  let cursor: string | undefined;
  do {
    const response = object(await codex.request("model/list", {
      limit: 100,
      includeHidden: false,
      ...(cursor ? { cursor } : {}),
    }));
    discovered.push(...array(response.data).map(readModel).filter((model) => model.slug));
    cursor = text(response.nextCursor) || undefined;
  } while (cursor);

  const selected = discovered.find((model) => model.isDefault) ?? discovered[0];
  if (!selected) throw new Error("Codex did not report any available models");
  return {
    defaultModel: selected.slug,
    modelDefaults: traits(selected),
    models: discovered.map(({ isDefault: _isDefault, ...model }) => model),
  };
}

export function defaultConfiguration(catalog: ProviderCatalog): SessionConfiguration {
  const model = findModel(catalog, catalog.defaultModel);
  return {
    model: model?.slug || catalog.defaultModel,
    reasoning: model?.defaultReasoning || "",
    serviceTier: model?.defaultServiceTier || "",
  };
}

export function selectModel(
  catalog: ProviderCatalog,
  configuration: SessionConfiguration,
  model: string,
): void {
  configuration.model = model;
  const selected = findModel(catalog, model);
  if (!selected?.reasoning.some((option) => option.id === configuration.reasoning)) {
    configuration.reasoning = selected?.defaultReasoning || "";
  }
  if (!selected?.serviceTiers.some((option) => option.id === configuration.serviceTier)) {
    configuration.serviceTier = selected?.defaultServiceTier || "";
  }
}

export function sessionConfigOptions(
  catalog: ProviderCatalog,
  configuration: SessionConfiguration,
): unknown[] {
  const model = findModel(catalog, configuration.model);
  const options: unknown[] = [{
    id: "model",
    name: "Model",
    category: "model",
    type: "select",
    currentValue: configuration.model,
    options: catalog.models.map((item) => ({ value: item.slug, name: item.name })),
  }];
  if (model?.reasoning.length) {
    options.push({
      id: "reasoning",
      name: "Thinking",
      category: "thought_level",
      type: "select",
      currentValue: configuration.reasoning,
      options: model.reasoning.map((item) => ({ value: item.id, name: item.label })),
    });
  }
  if (model?.serviceTiers.length) {
    options.push({
      id: "serviceTier",
      name: "Service tier",
      category: "model_config",
      type: "select",
      currentValue: configuration.serviceTier,
      options: model.serviceTiers.map((item) => ({ value: item.id, name: item.label })),
    });
  }
  return options;
}

function readModel(value: unknown): DiscoveredModel {
  const model = object(value);
  const slug = text(model.model) || text(model.id);
  const reasoning = array(model.supportedReasoningEfforts).map((entry) => {
    const option = object(entry);
    const id = text(option.reasoningEffort);
    return { id, label: optionLabel(id) };
  }).filter((option) => option.id);
  const additionalTiers = array(model.serviceTiers).map((entry) => {
    const option = object(entry);
    const id = text(option.id);
    return { id, label: text(option.name) || optionLabel(id) };
  }).filter((option) => option.id);
  const serviceTiers = additionalTiers.length > 0
    ? withStandardTier(additionalTiers)
    : withStandardTier(array(model.additionalSpeedTiers)
        .map((entry) => text(entry))
        .filter(Boolean)
        .map((id) => ({ id, label: optionLabel(id) })));
  return {
    slug,
    name: text(model.displayName) || slug,
    reasoning,
    defaultReasoning: text(model.defaultReasoningEffort),
    serviceTiers,
    defaultServiceTier: serviceTiers.length > 0
      ? text(model.defaultServiceTier) || STANDARD_SERVICE_TIER
      : "",
    defaultFavorite: model.isDefault === true,
    isDefault: model.isDefault === true,
  };
}

function withStandardTier(tiers: ProviderOption[]): ProviderOption[] {
  return tiers.length > 0 && !tiers.some((tier) => tier.id === STANDARD_SERVICE_TIER)
    ? [{ id: STANDARD_SERVICE_TIER, label: "Standard" }, ...tiers]
    : tiers;
}

function findModel(catalog: ProviderCatalog, slug: string): ProviderModel | undefined {
  return catalog.models.find((model) => model.slug === slug);
}

function traits(model: ProviderModel): ProviderCatalog["modelDefaults"] {
  return {
    reasoning: model.reasoning,
    defaultReasoning: model.defaultReasoning,
    serviceTiers: model.serviceTiers,
    defaultServiceTier: model.defaultServiceTier,
  };
}

function optionLabel(value: string): string {
  if (value === "xhigh") return "Extra high";
  return value ? value[0]!.toUpperCase() + value.slice(1).replaceAll("_", " ") : "";
}
