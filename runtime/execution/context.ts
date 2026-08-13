import type {
  AgentContextUsage,
  AgentProviderUsage,
} from "@sand/extension-api";

export function nextContextUsage(
  current: AgentContextUsage | undefined,
  response: AgentProviderUsage,
): AgentContextUsage | undefined {
  const usedTokens = tokens(response.totalTokens);
  const maxTokens = tokens(response.maxContextTokens);
  if (usedTokens === null || maxTokens === null) return current;
  return {
    usedTokens,
    maxTokens,
    processedTokens: (current?.processedTokens ?? 0) + usedTokens,
  };
}

function tokens(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}
