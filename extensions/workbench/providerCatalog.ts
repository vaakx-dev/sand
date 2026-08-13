import type { AgentProviderDescription } from "@sand/extension-api";

import type { ProviderContribution } from "./api.ts";
import type { ProviderDescription } from "./models.ts";

const EMPTY_TRAITS = {
  reasoning: [],
  defaultReasoning: "",
  serviceTiers: [],
  defaultServiceTier: "",
};

export function providerCatalog(
  installed: ProviderContribution[],
  connected: AgentProviderDescription[],
): ProviderDescription[] {
  const active = new Map(connected.map((provider) => [provider.id, provider]));
  const providers = installed.map((contribution) => {
    const provider = active.get(contribution.id);
    active.delete(contribution.id);
    return {
      ...(provider ?? disconnectedProvider(contribution)),
      id: contribution.id,
      name: contribution.name,
      presentation: {
        ...provider?.presentation,
        description: contribution.description,
        icon: contribution.icon,
      },
      connection: contribution.connection,
    };
  });
  return [...providers, ...active.values()];
}

function disconnectedProvider(contribution: ProviderContribution): AgentProviderDescription {
  return {
    id: contribution.id,
    name: contribution.name,
    defaultModel: "",
    modelDefaults: EMPTY_TRAITS,
    models: [],
  };
}
