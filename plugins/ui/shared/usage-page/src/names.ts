import type { AccountUsage } from '@sand/usage/contract'

const sources: Record<string, { label: string; provider: string }> = {
  claude: { label: 'Claude Code', provider: 'anthropic' },
  codex: { label: 'Codex', provider: 'openai' },
}

export const sourceName = (source: string) => sources[source]?.label ?? source

export const providerOf = (source: string) => sources[source]?.provider ?? 'unknown'

export const isSubscription = (account: Pick<AccountUsage, 'billing'>) => account.billing === 'plan'
