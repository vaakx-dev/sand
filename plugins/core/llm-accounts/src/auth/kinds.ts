import type { AccountKind, Billing, KeyKind, LoginMethod, NewModels, PlanApi, ServerProvider } from '../contract'

export const keyKinds: KeyKind[] = ['anthropic', 'openai', 'openrouter']

export const keyLabels: Record<KeyKind, string> = {
  anthropic: 'Anthropic API',
  openai: 'OpenAI API',
  openrouter: 'OpenRouter',
}

export const keyApis: Partial<Record<KeyKind, PlanApi>> = { anthropic: 'anthropic', openai: 'openai' }

export const kindOrder: AccountKind[] = [...keyKinds, 'server']

const billings: Record<LoginMethod, Billing> = { oauth: 'plan', api_key: 'api', server: 'local' }

export const billingOf = (method: LoginMethod) => billings[method]

const hiddenNew = new Set<AccountKind>(['openai', 'openrouter'])

export const newModelsOf = (kind: AccountKind): NewModels => (hiddenNew.has(kind) ? 'hide' : 'show')

const serverProviders: ServerProvider[] = ['ollama', 'lmstudio', 'server']

export const isKeyKind = (id: unknown): id is KeyKind => keyKinds.some(kind => kind === id)

export const isServerProvider = (value: unknown): value is ServerProvider => serverProviders.some(provider => provider === value)

export const signInError = (label?: string) => new Error(`Sign in${label ? ` to ${label}` : ''} under Settings → Accounts`)
