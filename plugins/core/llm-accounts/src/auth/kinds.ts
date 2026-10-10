import type { AccountKind, Billing, KeyKind, NewModels, SignInKind } from '../contract'

export type FixedId = Exclude<AccountKind, 'server'>

export const fixedIds: FixedId[] = ['claude', 'codex', 'anthropic', 'openai', 'openrouter']

export const signInKinds: SignInKind[] = ['claude', 'codex']

export const keyKinds: KeyKind[] = ['anthropic', 'openai', 'openrouter']

export const kindOrder: AccountKind[] = [...fixedIds, 'server']

export const fixedLabels: Record<FixedId, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  anthropic: 'Anthropic API',
  openai: 'OpenAI API',
  openrouter: 'OpenRouter',
}

export const logos: Record<FixedId, string> = {
  claude: 'anthropic',
  codex: 'openai',
  anthropic: 'anthropic',
  openai: 'openai',
  openrouter: 'openrouter',
}

export const billings: Record<AccountKind, Billing> = {
  claude: 'plan',
  codex: 'plan',
  anthropic: 'api',
  openai: 'api',
  openrouter: 'api',
  server: 'local',
}

export const newModelsDefaults: Record<AccountKind, NewModels> = {
  claude: 'show',
  codex: 'show',
  anthropic: 'show',
  openai: 'hide',
  openrouter: 'hide',
  server: 'show',
}

export const isFixed = (id: string): id is FixedId => (fixedIds as string[]).includes(id)

export const isSignInKind = (id: unknown): id is SignInKind => (signInKinds as unknown[]).includes(id)

export const isKeyKind = (id: unknown): id is KeyKind => (keyKinds as unknown[]).includes(id)

export const legacyId = (provider: string, method: string): FixedId =>
  provider === 'openai' ? (method === 'oauth' ? 'codex' : 'openai') : method === 'oauth' ? 'claude' : 'anthropic'

const settingsPath = 'Settings → Accounts'

export const signInError = (label?: string) => new Error(`Sign in${label ? ` to ${label}` : ''} under ${settingsPath}`)
