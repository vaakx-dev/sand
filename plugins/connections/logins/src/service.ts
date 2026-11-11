import type { ConversationRef } from '@sand/engine/contract'
import type { InputOf } from '@sand/host-hub/contract'
import { serial } from '@sand/util'
import type { Vault } from '@sand/vault'
import {
  type Access,
  type External,
  externalSources,
  type Grant,
  type Login,
  type LoginKind,
  type loginAdd,
  type loginChange,
  type loginPick,
  type Logins,
  type LoginsState,
  type LoginValues,
  type Pointer,
  type Use,
  type UseRequest,
} from './contract'
import { createRedactor, type Print, shortest } from './redact'
import type { Responsible } from './responsible'
import { siteOf } from './site'
import { type Commands, createSources, type Credentials, sourceLabel } from './sources'
import { totpCode, totpSecret } from './totp'

interface Common {
  id: string
  name: string
  site?: string
  bots: string[]
  threads: string[]
  ask: boolean
  added: number
  uses: Use[]
}

interface Held extends Common {
  values: LoginValues
  totp?: string
}

interface Pointed extends Common {
  kind: LoginKind
  pointer: Pointer
  totp: boolean
}

export type Saved = Held | Pointed

type Allowed = Pick<Saved, 'bots' | 'threads'>

export interface Data {
  saved: Saved[]
  credentials?: Credentials
}

export interface Deps {
  commands: Commands
  responsible(conversation: ConversationRef): Responsible
  title(conversation: ConversationRef): string
  changed(): void
}

type ValueChange = Pick<InputOf<typeof loginChange>, 'username' | 'password' | 'value' | 'totp'>

const usesKept = 100
const codeLife = 10 * 60_000
export const onceLife = 10 * 60_000

const markOf = (name: string) => `[secret: ${name}]`

const kindOf = (entry: Saved) => ('values' in entry ? entry.values.kind : entry.kind)

const valuesIn = (values: LoginValues) => (values.kind === 'website' ? [values.username, values.password] : [values.value])

const loginOf = (entry: Saved): Login => ({
  id: entry.id,
  kind: kindOf(entry),
  name: entry.name,
  ...(entry.site && { site: entry.site }),
  bots: entry.bots,
  threads: entry.threads,
  ask: entry.ask,
  totp: Boolean(entry.totp),
  added: entry.added,
  ...('values' in entry ? { source: 'sand' as const } : entry.pointer),
})

const nextTotp = (given: string | null | undefined, current: string | undefined) => {
  if (given === undefined) return current
  return given === null ? undefined : totpSecret(given)
}

const changedValues = (entry: Held, { username, password, value, totp }: ValueChange): Held => {
  const { totp: current, values, ...rest } = entry
  if (values.kind === 'key' && (username || password || totp !== undefined)) throw new Error(`${entry.name} is a key: it has no username, password or authenticator`)
  if (values.kind === 'website' && value) throw new Error(`${entry.name} is a website login: change its username or password instead`)
  const kept = nextTotp(totp, current)
  return {
    ...rest,
    values:
      values.kind === 'website'
        ? { kind: 'website', username: username ?? values.username, password: password ?? values.password }
        : { kind: 'key', value: value ?? values.value },
    ...(kept && { totp: kept }),
  }
}

export const websiteOf = (entry: Saved) => {
  if (kindOf(entry) !== 'website' || !entry.site) throw new Error(`${entry.name} is a key, not a website login: pass it to Shell with its logins parameter.`)
  return entry.site
}

export const createLogins = (vault: Vault<Data>, data: Data | undefined, deps: Deps) => {
  const redactor = createRedactor()
  let saved = data?.saved ?? []
  let held: Print[] = []
  const fetched = new Map<string, Print[]>()
  const once = new Map<string, { entry: Held; until: number }>()
  let passing: (Print & { until: number })[] = []
  const persist = serial()

  const printsOf = (values: string[], name: string) => values.filter(value => value.length >= shortest).map(value => redactor.print(value, markOf(name)))

  const heldPrints = () => [
    ...saved.flatMap(entry => ('values' in entry ? printsOf([...valuesIn(entry.values), ...(entry.totp ? [entry.totp] : [])], entry.name) : [])),
    ...externalSources.flatMap(source => {
      const credential = sources.credentials()[source]
      return credential ? printsOf([credential], sourceLabel(source)) : []
    }),
  ]

  const write = () => {
    held = heldPrints()
    const credentials = sources.credentials()
    return persist(() => (saved.length || Object.keys(credentials).length ? vault.write({ saved, credentials }) : vault.clear()))
  }

  const prune = () => {
    const now = Date.now()
    passing = passing.filter(print => print.until > now)
    for (const [id, { until }] of once) if (until <= now) once.delete(id)
  }

  const redact = (text: string) => {
    prune()
    return redactor.redact(text, [...held, ...[...fetched.values()].flat(), ...passing])
  }

  const sources = createSources(deps.commands, data?.credentials ?? {}, { redact, save: write, changed: deps.changed })
  held = heldPrints()

  const replace = (next: Saved[]) => {
    saved = next
    return write()
  }

  const commit = async (next: Saved[]) => {
    await replace(next)
    deps.changed()
  }

  const find = (id: string) => {
    prune()
    const found = saved.find(entry => entry.id === id) ?? once.get(id)?.entry
    if (!found) throw new Error(`No saved login "${id}". Call logins for the ids.`)
    return found
  }

  const grantOf = (entry: Saved, conversation: ConversationRef): Grant | undefined => {
    const { bot, threads } = deps.responsible(conversation)
    if (bot && entry.bots.includes(bot)) return 'bot'
    return threads.some(thread => entry.threads.includes(thread)) ? 'thread' : undefined
  }

  const accessOf = (entry: Saved, conversation: ConversationRef): Access => {
    if (entry.ask) return 'ask'
    return grantOf(entry, conversation) ? 'allowed' : 'unshared'
  }

  const refusals: Record<Exclude<Access, 'allowed'>, (name: string, owner: ConversationRef['owner']) => string> = {
    ask: name =>
      `Not used: the login ${name} is set to "Ask me every time", so agents can't use it. Tell the user: they can turn that off in the login's settings (Settings → Logins), or use it themselves.`,
    unshared: (name, owner) =>
      `Not used: the login ${name} isn't shared with this ${owner}. Tell the user: they can let it use the login in the login's settings (Settings → Logins), or use it themselves.`,
  }

  const granted = (entry: Saved, conversation: ConversationRef): Grant => {
    const grant = entry.ask ? undefined : grantOf(entry, conversation)
    if (grant) return grant
    throw new Error(refusals[entry.ask ? 'ask' : 'unshared'](entry.name, conversation.owner))
  }

  const record = async (entry: Saved, { conversation, action, site }: UseRequest, grant: Grant) => {
    if (once.has(entry.id)) return
    const { bot } = deps.responsible(conversation)
    const shown = site ?? entry.site
    const use: Use = {
      login: entry.id,
      at: Date.now(),
      action,
      owner: conversation.owner,
      conversation: conversation.id,
      title: deps.title(conversation),
      ...(bot && { bot }),
      ...(shown && { site: shown }),
      grant,
    }
    return replace(saved.map(item => (item.id === entry.id ? { ...item, uses: [use, ...item.uses].slice(0, usesKept) } : item)))
  }

  const fingerprint = (entry: Pointed, values: LoginValues) => {
    const known = fetched.get(entry.id) ?? []
    const fresh = printsOf(valuesIn(values), entry.name).filter(print => !known.some(({ mac }) => mac === print.mac))
    fetched.set(entry.id, [...known, ...fresh])
  }

  const valuesOf = async (entry: Saved) => {
    if ('values' in entry) return entry.values
    const values = await sources.values(entry.pointer, entry.kind)
    fingerprint(entry, values)
    return values
  }

  const codeOf = (entry: Saved) => {
    if (!('values' in entry)) return sources.code(entry.pointer)
    if (!entry.totp) throw new Error(`${entry.name} has no authenticator`)
    return totpCode(entry.totp)
  }

  const use = async (id: string, request: UseRequest) => {
    const entry = find(id)
    const grant = granted(entry, request.conversation)
    const one = once.get(id)
    if (one) {
      once.delete(id)
      return one.entry.values
    }
    const values = await valuesOf(entry)
    await record(entry, request, grant)
    return values
  }

  const code = async (id: string, request: UseRequest) => {
    const entry = find(id)
    const grant = granted(entry, request.conversation)
    const found = await codeOf(entry)
    await record(entry, request, grant)
    return found
  }

  const pass = (values: string[], name: string, until: number) => {
    passing = [...passing, ...printsOf(values, name).map(print => ({ ...print, until }))]
  }

  const remember = (found: string, name: string) => pass([found], name, Date.now() + codeLife)

  const common = (name: string, access: Allowed) => ({
    id: `login-${crypto.randomUUID().slice(0, 8)}`,
    name,
    ...access,
    ask: false,
    added: Date.now(),
    uses: [],
  })

  const heldOf = (input: InputOf<typeof loginAdd>, access: Allowed): Held =>
    input.kind === 'website'
      ? {
          ...common(input.name, access),
          site: siteOf(input.site),
          values: { kind: 'website', username: input.username, password: input.password },
          ...(input.totp && { totp: totpSecret(input.totp) }),
        }
      : { ...common(input.name, access), values: { kind: 'key', value: input.value } }

  const add = async (input: InputOf<typeof loginAdd>, access: Allowed = { bots: [], threads: [] }) => {
    const entry = heldOf(input, access)
    await commit([...saved, entry])
    return loginOf(entry)
  }

  const hold = (input: InputOf<typeof loginAdd>, access: Allowed) => {
    const entry = heldOf(input, access)
    const until = Date.now() + onceLife
    once.set(entry.id, { entry, until })
    pass(valuesIn(entry.values), entry.name, until + codeLife)
    return loginOf(entry)
  }

  const pick = async ({ name, site, kind, ...pointer }: InputOf<typeof loginPick>) => {
    const item = await sources.item(pointer)
    const chosen = kind ?? item.kind
    if (!sources.kinds(pointer.source).includes(chosen)) throw new Error(`${sourceLabel(pointer.source)} keeps keys, not website logins`)
    const where = chosen === 'website' ? (site ?? item.sites[0]) : undefined
    if (chosen === 'website' && !where) throw new Error(`${item.name} has no website: give it a site`)
    const entry: Pointed = {
      ...common(name ?? item.name, { bots: [], threads: [] }),
      ...(where && { site: siteOf(where) }),
      kind: chosen,
      pointer,
      totp: chosen === 'website' && Boolean(item.totp),
    }
    await commit([...saved, entry])
    return loginOf(entry)
  }

  const change = async ({ id, name, site, bots, threads, ask, ...values }: InputOf<typeof loginChange>) => {
    const entry = find(id)
    if (kindOf(entry) === 'key' && site) throw new Error(`${entry.name} is a key: it has no site`)
    const given = Object.values(values).some(value => value !== undefined)
    if (given && !('values' in entry)) throw new Error(`${entry.name} lives in ${sourceLabel(entry.pointer.source)}: change it there`)
    const next: Saved = {
      ...('values' in entry ? changedValues(entry, values) : entry),
      ...(name && { name }),
      ...(site && { site: siteOf(site) }),
      ...(bots && { bots }),
      ...(threads && { threads }),
      ...(ask !== undefined && { ask }),
    }
    await commit(saved.map(item => (item.id === id ? next : item)))
    return loginOf(next)
  }

  const remove = async (id: string) => {
    find(id)
    fetched.delete(id)
    await commit(saved.filter(entry => entry.id !== id))
    return state()
  }

  const state = (): LoginsState => ({ logins: saved.map(loginOf), keychain: vault.keychain(), sources: sources.statuses() })

  const service: Logins = {
    list: conversation => saved.map(entry => ({ ...loginOf(entry), access: accessOf(entry, conversation) })),
    use,
    redact,
  }

  const connect = async (source: External, secret: string) => {
    await sources.connect(source, secret)
    return state()
  }

  const disconnect = async (source: External) => {
    await sources.disconnect(source)
    return state()
  }

  return {
    service,
    state,
    find,
    code,
    record,
    remember,
    add,
    hold,
    pick,
    change,
    remove,
    connect,
    disconnect,
    search: sources.search,
    refresh: sources.refresh,
    uses: (id: string) => find(id).uses,
    responsible: deps.responsible,
  }
}

export type LoginsRuntime = ReturnType<typeof createLogins>
