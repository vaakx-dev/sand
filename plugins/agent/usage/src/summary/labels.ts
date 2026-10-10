import type { Billing } from '@sand/llm-accounts/contract'

interface SourceFacts {
  label: string
  provider: string
  billing: Billing
}

export const unknownSource = 'unknown'

const fixed: Record<string, SourceFacts> = {
  claude: { label: 'Claude Code', provider: 'anthropic', billing: 'plan' },
  codex: { label: 'Codex', provider: 'openai', billing: 'plan' },
  anthropic: { label: 'Anthropic API', provider: 'anthropic', billing: 'api' },
  openai: { label: 'OpenAI API', provider: 'openai', billing: 'api' },
  openrouter: { label: 'OpenRouter', provider: 'openrouter', billing: 'api' },
}

const unattributed: SourceFacts = { label: 'Unattributed', provider: unknownSource, billing: 'api' }

export const factsOf = (source: string): SourceFacts =>
  fixed[source] ?? (source === unknownSource ? unattributed : { label: source, provider: 'server', billing: 'local' })
