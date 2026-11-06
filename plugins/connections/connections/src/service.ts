import { serial } from '@sand/util'
import type { Dispose } from 'drydock'
import type { Account, Client, Connections, ConnectionState, FlowEnd, Kind, KindInfo, OAuth } from './contract'
import { createFlows } from './flows'
import { bearer, refresh, TokenError } from './oauth'
import type { Data, Entry, Secret, Tokens, Vault } from './vault'

export interface Events {
  changed(): void
  removed(account: Account): void
  ended(end: FlowEnd): void
}

type OAuthEntry = Extract<Entry, { tokens: Tokens }>

const kindId = /^[a-z0-9-]+$/

const fresh = (tokens: Tokens) => !tokens.expires || tokens.expires - Date.now() > 60_000

const info = (kind: Kind, client: Client | undefined): KindInfo => {
  if (kind.oauth) return { id: kind.id, label: kind.label, method: 'oauth', client: !!client, readOnly: !!kind.oauth.readOnlyScopes, setup: kind.oauth.setup }
  return { id: kind.id, label: kind.label, method: 'form', client: false, readOnly: false, fields: kind.form.fields, ...(kind.form.help && { help: kind.form.help }) }
}

export const createConnections = (vault: Vault, data: Data, events: Events) => {
  const kinds = new Map<string, Kind>()
  const renewing = new Map<string, Promise<Tokens>>()
  let { entries, clients } = data
  const persist = serial()
  const flows = createFlows(events.ended)

  const save = () => persist(() => vault.write({ entries, clients }))

  const entry = (id: string) => {
    const found = entries.find(item => item.account.id === id)
    if (!found) throw new Error(`Unknown account "${id}"`)
    return found
  }

  const oauthEntry = (id: string): OAuthEntry => {
    const found = entry(id)
    if (!('tokens' in found)) throw new Error(`${found.account.name} doesn't sign in with OAuth`)
    return found
  }

  const kindOf = (id: string) => {
    const found = kinds.get(id)
    if (!found) throw new Error(`Unknown kind of account "${id}"`)
    return found
  }

  const oauthOf = (id: string): OAuth => {
    const found = kindOf(id)
    if (!found.oauth) throw new Error(`${found.label} doesn't sign in with OAuth`)
    return found.oauth
  }

  const clientOf = (id: string) => clients[id] ?? oauthOf(id).client

  const accounts = (kind?: string) => entries.flatMap(item => (!kind || item.account.kind === kind ? [item.account] : []))

  const replace = async (next: Entry) => {
    const before = entries.find(item => item.account.id === next.account.id)
    if (!before) return
    entries = entries.map(item => (item === before ? next : item))
    await save()
    if (before.account !== next.account) events.changed()
  }

  const connect = async (kind: string, name: string, readOnly: boolean, secret: Secret) => {
    const same = entries.find(item => item.account.kind === kind && item.account.name === name)
    const account: Account = same
      ? { id: same.account.id, kind, name, readOnly, added: same.account.added }
      : { id: `${kind}-${crypto.randomUUID().slice(0, 8)}`, kind, name, readOnly, added: Date.now() }
    const next = { account, ...secret }
    entries = same ? entries.map(item => (item === same ? next : item)) : [...entries, next]
    await save()
    events.changed()
    return account
  }

  const renewNow = async (id: string) => {
    const current = oauthEntry(id)
    try {
      const tokens = await refresh(oauthOf(current.account.kind), current.client, current.tokens)
      await replace({ ...oauthEntry(id), tokens })
      return tokens
    } catch (error) {
      if (!(error instanceof TokenError) || error.code !== 'invalid_grant') throw error
      const latest = oauthEntry(id)
      await replace({ ...latest, account: { ...latest.account, problem: 'Sign in again' } })
      throw new Error(`Sign in to ${current.account.name} again: ${error.message}`)
    }
  }

  const renew = (id: string) => {
    const running = renewing.get(id)
    if (running) return running
    const task = renewNow(id).finally(() => renewing.delete(id))
    renewing.set(id, task)
    return task
  }

  const send = async (id: string, url: string | URL, init?: RequestInit) => {
    const { account, tokens } = oauthEntry(id)
    if (account.problem) throw new Error(`${account.name}: ${account.problem}`)
    const used = fresh(tokens) ? tokens.access : (await renew(id)).access
    const response = await bearer(used)(url, init)
    if (response.status !== 401) return response
    await response.body?.cancel()
    const latest = oauthEntry(id).tokens.access
    return bearer(latest === used ? (await renew(id)).access : latest)(url, init)
  }

  const disconnect = async (id: string) => {
    const { account } = entry(id)
    entries = entries.filter(item => item.account.id !== id)
    await save()
    events.removed(account)
    events.changed()
  }

  const register = (kind: Kind): Dispose => {
    if (!kindId.test(kind.id)) throw new Error(`Kind ids use a-z, 0-9 and "-": "${kind.id}"`)
    kinds.set(kind.id, kind)
    events.changed()
    return () => {
      if (kinds.get(kind.id) !== kind) return
      kinds.delete(kind.id)
      events.changed()
    }
  }

  const service: Connections = {
    kind: register,
    accounts,
    fetch: send,
    values(id) {
      const found = entry(id)
      if (!('values' in found)) throw new Error(`${found.account.name} has no saved form`)
      return { ...found.values }
    },
    disconnect,
  }

  const state = (): ConnectionState => ({
    kinds: [...kinds.values()].map(kind => info(kind, kind.oauth && clientOf(kind.id))),
    accounts: accounts(),
    keychain: vault.keychain(),
  })

  const setClient = async (kind: string, client: Client) => {
    oauthOf(kind)
    clients = { ...clients, [kind]: client }
    await save()
    events.changed()
    return state()
  }

  const start = (kind: string, readOnly: boolean) => {
    const oauth = oauthOf(kind)
    const client = clientOf(kind)
    if (!client) throw new Error(`Enter the client ID for ${kindOf(kind).label} first`)
    const only = readOnly && !!oauth.readOnlyScopes
    return flows.start({ oauth, client, readOnly: only, connect: (name, tokens) => connect(kind, name, only, { tokens, client }) })
  }

  const saveForm = async (kind: string, values: Record<string, string>) => {
    const found = kindOf(kind)
    if (!found.form) throw new Error(`${found.label} signs in with OAuth`)
    const clean = Object.fromEntries(found.form.fields.map(field => [field.key, field.secret ? (values[field.key] ?? '') : (values[field.key] ?? '').trim()]))
    const name = await found.form.check(clean, AbortSignal.timeout(30_000))
    return connect(kind, name, false, { values: clean })
  }

  return { service, state, setClient, start, cancel: flows.cancel, saveForm, close: flows.close }
}

export type ConnectionsRuntime = ReturnType<typeof createConnections>
