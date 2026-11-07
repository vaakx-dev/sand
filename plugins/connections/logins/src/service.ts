import type { ConversationRef } from '@sand/engine/contract'
import type { InputOf } from '@sand/host-hub/contract'
import { serial } from '@sand/util'
import type { Vault } from '@sand/vault'
import type { Access, Grant, Login, loginAdd, loginChange, Logins, LoginsState, LoginValues, Use, UseRequest } from './contract'
import type { Responsible } from './responsible'
import { totpSecret } from './totp'

export interface Saved {
  id: string
  name: string
  site?: string
  bots: string[]
  threads: string[]
  ask: boolean
  added: number
  values: LoginValues
  totp?: string
  uses: Use[]
}

export interface Data {
  saved: Saved[]
}

export interface Deps {
  responsible(conversation: ConversationRef): Responsible
  title(conversation: ConversationRef): string
  changed(): void
}

interface Mark {
  value: string
  mark: string
}

const usesKept = 100
const codeLife = 10 * 60_000
const shortest = 4

export const siteOf = (given: string) => {
  const host = URL.parse(given.includes('://') ? given : `https://${given}`)?.hostname
  if (!host) throw new Error(`"${given}" isn't a website domain like bank.com`)
  return host.toLowerCase()
}

const markOf = (name: string) => `[secret: ${name}]`

const secretsOf = ({ values, totp }: Saved) => [...(values.kind === 'website' ? [values.username, values.password] : [values.value]), ...(totp ? [totp] : [])]

const marksOf = (saved: Saved[]) =>
  saved
    .flatMap(entry => secretsOf(entry).flatMap(value => (value.length >= shortest ? [{ value, mark: markOf(entry.name) }] : [])))
    .sort((a, b) => b.value.length - a.value.length)

const loginOf = ({ id, name, site, bots, threads, ask, added, values, totp }: Saved): Login => ({
  id,
  kind: values.kind,
  name,
  ...(site && { site }),
  bots,
  threads,
  ask,
  totp: Boolean(totp),
  added,
})

const nextTotp = (given: string | null | undefined, current: string | undefined) => {
  if (given === undefined) return current
  return given === null ? undefined : totpSecret(given)
}

export const websiteOf = (entry: Saved) => {
  if (entry.values.kind !== 'website' || !entry.site) throw new Error(`${entry.name} is a key, not a website login: pass it to Shell with its logins parameter.`)
  return { site: entry.site, ...entry.values }
}

export const createLogins = (vault: Vault<Data>, data: Data | undefined, deps: Deps) => {
  let saved = data?.saved ?? []
  let marks = marksOf(saved)
  let codes: (Mark & { at: number })[] = []
  const persist = serial()

  const replace = (next: Saved[]) => {
    saved = next
    marks = marksOf(next)
    return persist(() => (saved.length ? vault.write({ saved }) : vault.clear()))
  }

  const commit = async (next: Saved[]) => {
    await replace(next)
    deps.changed()
  }

  const find = (id: string) => {
    const found = saved.find(entry => entry.id === id)
    if (!found) throw new Error(`No saved login "${id}". Call logins for the ids.`)
    return found
  }

  const grantOf = (entry: Saved, conversation: ConversationRef): Grant | undefined => {
    if (entry.ask) return undefined
    const { bot, threads } = deps.responsible(conversation)
    if (bot && entry.bots.includes(bot)) return 'bot'
    return threads.some(thread => entry.threads.includes(thread)) ? 'thread' : undefined
  }

  const accessOf = (entry: Saved, conversation: ConversationRef): Access => (grantOf(entry, conversation) ? 'allowed' : 'ask')

  const record = (entry: Saved, { conversation, action, site }: UseRequest, grant: Grant) => {
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

  const take = async (id: string, request: UseRequest) => {
    const entry = find(id)
    await record(entry, request, grantOf(entry, request.conversation) ?? 'user')
    return entry
  }

  const remember = (code: string, name: string) => {
    codes = [...codes, { value: code, mark: markOf(name), at: Date.now() }]
  }

  const redact = (text: string) => {
    const cutoff = Date.now() - codeLife
    codes = codes.filter(code => code.at > cutoff)
    return [...marks, ...codes].reduce((out, { value, mark }) => out.split(value).join(mark), text)
  }

  const add = async (input: InputOf<typeof loginAdd>, access: Pick<Saved, 'bots' | 'threads'> = { bots: [], threads: [] }) => {
    const common = { id: `login-${crypto.randomUUID().slice(0, 8)}`, name: input.name, ...access, ask: false, added: Date.now(), uses: [] }
    const entry: Saved =
      input.kind === 'website'
        ? {
            ...common,
            site: siteOf(input.site),
            values: { kind: 'website', username: input.username, password: input.password },
            ...(input.totp && { totp: totpSecret(input.totp) }),
          }
        : { ...common, values: { kind: 'key', value: input.value } }
    await commit([...saved, entry])
    return loginOf(entry)
  }

  const change = async ({ id, name, site, username, password, value, totp, bots, threads, ask }: InputOf<typeof loginChange>) => {
    const { totp: current, ...entry } = find(id)
    const { values } = entry
    if (values.kind === 'key' && (site || username || password || totp !== undefined))
      throw new Error(`${entry.name} is a key: it has no site, username, password or authenticator`)
    if (values.kind === 'website' && value) throw new Error(`${entry.name} is a website login: change its username or password instead`)
    const kept = nextTotp(totp, current)
    const next: Saved = {
      ...entry,
      ...(name && { name }),
      ...(site && { site: siteOf(site) }),
      ...(bots && { bots }),
      ...(threads && { threads }),
      ...(ask !== undefined && { ask }),
      values:
        values.kind === 'website'
          ? { kind: 'website', username: username ?? values.username, password: password ?? values.password }
          : { kind: 'key', value: value ?? values.value },
      ...(kept && { totp: kept }),
    }
    await commit(saved.map(item => (item.id === id ? next : item)))
    return loginOf(next)
  }

  const remove = async (id: string) => {
    find(id)
    await commit(saved.filter(entry => entry.id !== id))
    return state()
  }

  const state = (): LoginsState => ({ logins: saved.map(loginOf), keychain: vault.keychain() })

  const service: Logins = {
    list: conversation => saved.map(entry => ({ ...loginOf(entry), access: accessOf(entry, conversation) })),
    access: (id, conversation) => accessOf(find(id), conversation),
    use: async (id, request) => (await take(id, request)).values,
    redact,
  }

  return { service, state, find, take, record, remember, add, change, remove, uses: (id: string) => find(id).uses, responsible: deps.responsible }
}

export type LoginsRuntime = ReturnType<typeof createLogins>
