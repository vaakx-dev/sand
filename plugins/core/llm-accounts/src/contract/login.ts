export type AccountKind = 'claude' | 'codex' | 'anthropic' | 'openai' | 'openrouter' | 'server'

export type SignInKind = 'claude' | 'codex'

export type KeyKind = 'anthropic' | 'openai' | 'openrouter'

export type LoginMethod = 'oauth' | 'api_key' | 'server'

export type LoginPending =
  | { kind: 'paste'; url: string }
  | { kind: 'device'; url: string; code: string; expires: number }

export interface LoginConflict {
  device: string
  pc: string
}

export interface LoginAccount {
  id: string
  kind: AccountKind
  provider: string
  label: string
  signedIn: boolean
  shared: boolean
  method?: LoginMethod
  env?: string
  email?: string
  plan?: string
  url?: string
  pending?: LoginPending
  conflict?: LoginConflict
  error?: string
}

export interface LoginRemoteAccount {
  id: string
  kind: AccountKind
  provider: string
  label: string
  method: LoginMethod
  plan?: string
  device: string
  pc: string
  online: boolean
  inUse: boolean
}

export interface LoginPc {
  device: string
  name: string
  online: boolean
  checked: boolean
  shares: string[]
  error?: string
}

export interface LoginSharePc {
  id: string
  name: string
  lastSeen: number
  lastUsed?: number
}

export interface LoginState {
  accounts: LoginAccount[]
  remote: LoginRemoteAccount[]
  pcs: LoginPc[]
  usedBy: LoginSharePc[]
}

export type ServerProvider = 'ollama' | 'lmstudio' | 'server'

export interface ServerDraft {
  id?: string
  name: string
  url: string
  key?: string
  provider?: ServerProvider
}

export interface DetectedServer {
  name: string
  url: string
  provider: ServerProvider
  models: number
}
