import type {
  AgentModelTraits,
  AgentProviderModel,
  AgentProviderOption,
} from "@sand/extension-api";

const REASONING: AgentProviderOption[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "xhigh", label: "Extra High" },
  { id: "max", label: "Max" },
  { id: "ultra", label: "Ultra" },
];

const SERVICE_TIERS: AgentProviderOption[] = [
  { id: "standard", label: "Standard" },
  { id: "fast", label: "Fast" },
];

export const CHATGPT_MODEL_DEFAULTS: AgentModelTraits = {
  reasoning: REASONING,
  defaultReasoning: "high",
  serviceTiers: SERVICE_TIERS,
  defaultServiceTier: "standard",
};

export const CHATGPT_DEFAULT_MODEL = "gpt-5.6-sol";
export const CHATGPT_CONTEXT_WINDOW = 258_000;

export const CHATGPT_MODELS: AgentProviderModel[] = [
  model(CHATGPT_DEFAULT_MODEL, "GPT-5.6-Sol", true),
  model("gpt-5.6-luna", "GPT-5.6-Luna", true),
  model("gpt-5.6-terra", "GPT-5.6-Terra"),
  model("gpt-5.5", "GPT-5.5"),
  model("gpt-5.4", "GPT-5.4"),
];

function model(slug: string, name: string, defaultFavorite = false): AgentProviderModel {
  return {
    slug,
    name,
    contextWindow: CHATGPT_CONTEXT_WINDOW,
    defaultFavorite,
    ...CHATGPT_MODEL_DEFAULTS,
  };
}
