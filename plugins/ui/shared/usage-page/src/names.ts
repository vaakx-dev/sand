import type { AccountUsage } from '@sand/usage/contract'

const brands: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  server: 'Local servers',
  unknown: 'Other',
}

const sources: Record<string, { label: string; provider: string }> = {
  claude: { label: 'Claude Code', provider: 'anthropic' },
  codex: { label: 'Codex', provider: 'openai' },
}

export const providerName = (id: string) => brands[id] ?? id.charAt(0).toUpperCase() + id.slice(1)

export const sourceName = (source: string) => sources[source]?.label ?? source

export const providerOf = (source: string) => sources[source]?.provider ?? 'unknown'

export const isSubscription = (account: Pick<AccountUsage, 'billing'>) => account.billing === 'plan'

export const isLocal = (account: Pick<AccountUsage, 'billing'>) => account.billing === 'local'

export const shortName = (account: AccountUsage) => (account.billing === 'api' && account.provider in brands ? 'API key' : account.label)

export const listText = (names: string[]) => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)
