import type { AccountKind, Billing, KeyKind, NewModels, ServerProvider, SignInKind } from '../contract'

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

const serverProviders: ServerProvider[] = ['ollama', 'lmstudio', 'server']

export const isFixed = (id: string): id is FixedId => fixedIds.some(fixed => fixed === id)

export const isSignInKind = (id: unknown): id is SignInKind => signInKinds.some(kind => kind === id)

export const isKeyKind = (id: unknown): id is KeyKind => keyKinds.some(kind => kind === id)

export const isServerProvider = (value: unknown): value is ServerProvider => serverProviders.some(provider => provider === value)

export const signInError = (label?: string) => new Error(`Sign in${label ? ` to ${label}` : ''} under Settings → Accounts`)
