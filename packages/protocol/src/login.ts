export type LoginProvider = 'anthropic' | 'openai'

export type LoginMethod = 'oauth' | 'api_key'

export type LoginPending =
  | { kind: 'paste'; url: string }
  | { kind: 'device'; url: string; code: string; expires: number }

export interface LoginConflict {
  device: string
  pc: string
}

export interface LoginAccount {
  provider: LoginProvider
  label: string
  subscription: string
  signedIn: boolean
  shared: boolean
  method?: LoginMethod
  env?: string
  email?: string
  plan?: string
  pending?: LoginPending
  conflict?: LoginConflict
  error?: string
}

export interface LoginRemoteAccount {
  provider: LoginProvider
  label: string
  subscription: string
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
