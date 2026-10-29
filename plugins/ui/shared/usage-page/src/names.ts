import type { AccountUsage } from '@sand/usage/contract'

const sources: Record<string, { label: string; provider: string }> = {
  claude: { label: 'Claude Code', provider: 'anthropic' },
  codex: { label: 'Codex', provider: 'openai' },
}

export const sourceName = (source: string) => sources[source]?.label ?? source

export const providerOf = (source: string) => sources[source]?.provider ?? 'unknown'

export const isSubscription = (account: Pick<AccountUsage, 'billing'>) => account.billing === 'plan'

export const listText = (names: string[]) => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)
