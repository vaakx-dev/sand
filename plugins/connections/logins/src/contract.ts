import type { ConversationRef } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export const loginKinds = ['website', 'key'] as const

export type LoginKind = (typeof loginKinds)[number]

export const externalSources = ['bitwarden', 'bitwarden-secrets', '1password'] as const

export type External = (typeof externalSources)[number]

export type Source = 'sand' | External

export type Pointer =
  | { source: 'bitwarden'; item: string }
  | { source: 'bitwarden-secrets'; item: string }
  | { source: '1password'; item: string; vault: string; account?: string }

export type Login = {
  id: string
  kind: LoginKind
  name: string
  site?: string
  bots: string[]
  threads: string[]
  ask: boolean
  totp: boolean
  added: number
} & ({ source: 'sand' } | Pointer)

export type SignIn = { status: 'signed-out' | 'locked' | 'ready'; account?: string }

export type SourceStatus = { status: 'missing' } | ({ saved: boolean } & (SignIn | { status: 'failed'; message: string }))

export type SourceItem = Pointer & {
  name: string
  kind: LoginKind
  sites: string[]
  totp?: boolean
  place?: string
}

export type LoginValues = { kind: 'website'; username: string; password: string } | { kind: 'key'; value: string }

export const useActions = ['fill', 'code', 'env'] as const

export type UseAction = (typeof useActions)[number]

export type Grant = 'bot' | 'thread' | 'user'

export interface Use {
  login: string
  at: number
  action: UseAction
  owner: ConversationRef['owner']
  conversation: string
  title: string
  bot?: string
  site?: string
  grant: Grant
}

export type Access = 'allowed' | 'ask' | 'unshared'

export interface UseRequest {
  conversation: ConversationRef
  action: UseAction
  site?: string
}

export interface Logins {
  list(conversation: ConversationRef): (Login & { access: Access })[]
  use(login: string, request: UseRequest): Promise<LoginValues>
  redact(text: string): string
}

export const logins = service<Logins>('logins')

export interface LoginsState {
  logins: Login[]
  keychain: boolean
  sources: Record<External, SourceStatus>
}

export const loginsWire = wireEvent<LoginsState>('logins.state')

const id = z.string().min(1)
const name = z.string().trim().min(1).max(100)
const site = z.string().trim().min(1).max(253)
const secret = z.string().min(1).max(4000)

export const loginsState = request('logins.state', { input: z.object({}), output: type<LoginsState>() })

export const loginAdd = request('logins.add', {
  input: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('website'), name, site, username: secret, password: secret, totp: secret.optional() }),
    z.object({ kind: z.literal('key'), name, value: secret }),
  ]),
  output: type<Login>(),
})

export const loginChange = request('logins.change', {
  input: z.object({
    id,
    name: name.optional(),
    site: site.optional(),
    username: secret.optional(),
    password: secret.optional(),
    value: secret.optional(),
    totp: secret.nullable().optional(),
    bots: z.array(id).optional(),
    threads: z.array(id).optional(),
    ask: z.boolean().optional(),
  }),
  output: type<Login>(),
})

const external = z.enum(externalSources)
const ref = z.string().regex(/^[A-Za-z0-9][\w.@-]{0,199}$/, 'Not an item id')
const picked = { name: name.optional(), site: site.optional(), kind: z.enum(loginKinds).optional() }

export const sourceConnect = request('logins.connect', { input: z.object({ source: external, secret }), output: type<LoginsState>() })

export const sourceDisconnect = request('logins.disconnect', { input: z.object({ source: external }), output: type<LoginsState>() })

export const sourceSearch = request('logins.search', {
  input: z.object({ source: external, query: z.string().trim().max(200) }),
  output: type<SourceItem[]>(),
})

export const loginPick = request('logins.pick', {
  input: z.discriminatedUnion('source', [
    z.object({ source: z.literal('bitwarden'), item: ref, ...picked }),
    z.object({ source: z.literal('bitwarden-secrets'), item: ref, ...picked }),
    z.object({ source: z.literal('1password'), item: ref, vault: ref, account: ref.optional(), ...picked }),
  ]),
  output: type<Login>(),
})

export const loginRemove = request('logins.remove', { input: z.object({ id }), output: type<LoginsState>() })

export const loginUses = request('logins.uses', { input: z.object({ id }), output: type<Use[]>() })

export type AskStatus = 'saved' | 'held' | 'filled' | 'approved' | 'declined' | 'timed_out' | 'cancelled'

export interface SecretRequest {
  id: string
  title: string
  reason: string
  placeholder?: string
  site?: string
  once?: boolean
}

export interface CodeRequest {
  id: string
  login: string
  name: string
  site: string
  prompt: string
}

export interface AskAnswer {
  id: string
  status: AskStatus
  login?: string
}

export const secretEntry = 'secret-request'
export const codeEntry = 'login-code'
export const answerEntry = 'secret-answer'

const target = { session: id, id }

export const askWaiting = request('logins.waiting', { input: z.object(target), output: type<boolean>(), place: 'thread' })
export const askDecline = request('logins.decline', { input: z.object(target), output: type<void>(), place: 'thread' })
export const secretSave = request('logins.secret', {
  input: z.union([z.object({ ...target, save: z.boolean(), value: secret }), z.object({ ...target, save: z.boolean(), username: secret, password: secret })]),
  output: type<void>(),
  place: 'thread',
})
export const codeAnswer = request('logins.code', {
  input: z.union([z.object({ ...target, code: z.string().trim().min(1).max(64) }), z.object({ ...target, approved: z.literal(true) })]),
  output: type<void>(),
  place: 'thread',
})
