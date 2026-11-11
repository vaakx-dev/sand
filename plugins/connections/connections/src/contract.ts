import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { event, service, type ContextCore, type Dispose } from 'drydock'
import { z } from 'zod'

export interface Client {
  id: string
  secret?: string
}

export type Authorized = (url: string | URL, init?: RequestInit) => Promise<Response>

export interface Setup {
  help: string
  steps: string
}

export interface OAuth {
  authorize: string
  token: string
  scopes: string[]
  readOnlyScopes?: string[]
  params?: Record<string, string>
  loopback?: 'localhost' | '127.0.0.1'
  client?: Client
  setup: Setup
  identify(fetch: Authorized, signal: AbortSignal): Promise<string>
}

export interface Field {
  key: string
  label: string
  secret?: boolean
  placeholder?: string
  value?: string
}

export interface Form {
  fields: Field[]
  help?: string
  check(values: Record<string, string>, signal: AbortSignal): Promise<string>
}

interface KindBase {
  id: string
  label: string
}

export type Kind = KindBase & ({ oauth: OAuth; form?: never } | { form: Form; oauth?: never })

export interface Account {
  id: string
  kind: string
  name: string
  readOnly: boolean
  added: number
  problem?: string
}

export interface Connections {
  kind(kind: Kind): Dispose
  accounts(kind?: string): Account[]
  fetch(account: string, url: string | URL, init?: RequestInit): Promise<Response>
  values(account: string): Record<string, string>
  disconnect(account: string): Promise<void>
}

export const connections = service<Connections>('connections')

export const connectionsChange = event<(accounts: Account[]) => void>('connections.change')
export const connectionRemoved = event<(account: Account) => void>('connection.removed')

export interface AccountUse {
  start(account: Account): Dispose
  removed(account: Account): void
}

const sameUse = (a: Account, b: Account) => a.name === b.name && a.readOnly === b.readOnly

export const eachAccount = (ctx: ContextCore, service: Connections, kind: string, use: AccountUse) => {
  const running = new Map<string, { account: Account; stop: Dispose }>()
  const stop = (id: string) => {
    void running.get(id)?.stop()
    running.delete(id)
  }
  const sync = () => {
    const current = service.accounts(kind)
    for (const [id, { account }] of running) if (!current.some(other => other.id === id && sameUse(other, account))) stop(id)
    for (const account of current) if (!running.has(account.id)) running.set(account.id, { account, stop: use.start(account) })
  }
  ctx.on(connectionsChange, sync)
  ctx.on(connectionRemoved, account => {
    if (account.kind !== kind) return
    stop(account.id)
    use.removed(account)
  })
  ctx.effect(() => {
    sync()
    return () => [...running.keys()].forEach(stop)
  })
}

export interface KindInfo {
  id: string
  label: string
  method: 'oauth' | 'form'
  client: boolean
  readOnly: boolean
  setup?: Setup
  fields?: Field[]
  help?: string
}

export interface ConnectionState {
  kinds: KindInfo[]
  accounts: Account[]
  keychain: boolean
}

export interface FlowEnd {
  flow: string
  account?: Account
  error?: string
}

export const connectionsWire = wireEvent<ConnectionState>('connections.state')
export const connectionFlowWire = wireEvent<FlowEnd>('connection.flow')

const kind = lazy(() => z.string().min(1))

export const connectionState = request('connections.state', { input: () => z.object({}), output: type<ConnectionState>() })
export const connectionClient = request('connections.client', {
  input: () => z.object({ kind: kind(), id: z.string().trim().min(1).max(500), secret: z.string().trim().max(500).optional() }),
  output: type<ConnectionState>(),
})
export const connectionStart = request('connections.start', {
  input: () => z.object({ kind: kind(), readOnly: z.boolean().optional() }),
  output: type<{ flow: string; url: string }>(),
})
export const connectionCancel = request('connections.cancel', { input: () => z.object({ flow: z.string() }), output: type<boolean>() })
export const connectionSave = request('connections.save', {
  input: () => z.object({ kind: kind(), values: z.record(z.string(), z.string().max(4000)) }),
  output: type<Account>(),
})
export const connectionRemove = request('connections.remove', { input: () => z.object({ account: z.string() }), output: type<ConnectionState>() })
