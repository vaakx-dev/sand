import type { AccountKind, KeyKind, LoginAccount, LoginConflict, LoginMethod, LoginPending, LoginSignIn, PlanApi, PlanTokens } from '../contract'
import { errorMessage } from '@sand/kit'
import { envKey, envNames } from './env'
import { isKeyKind, keyApis, keyKinds, keyLabels, signInError } from './kinds'
import { ownAccount, serverAccount, type Status } from './listing'
import type { PlanRegistry } from './plans'
import { authStore, credentialOf, serversOf, type Credential, type OAuth, type Saved, type ServerEntry } from './store'

const margin = 5 * 60_000

const fresh = (tokens: OAuth) => tokens.expires - Date.now() > margin

const isRejected = (error: unknown) => error instanceof Error && 'rejected' in error && error.rejected === true

export type Accounts = ReturnType<typeof createAccounts>

export const createAccounts = (path: string, plans: PlanRegistry, changed: () => void) => {
  const store = authStore(path)
  let saved: Saved = {}
  const pending = new Map<string, LoginPending>()
  const errors = new Map<string, string>()
  const conflicts = new Map<string, LoginConflict>()
  const refreshing = new Map<string, Promise<Credential>>()

  const owned = (id: string) => isKeyKind(id) || !!plans.get(id)
  const ownIds = () => [...plans.list().map(plan => plan.id), ...keyKinds]
  const stored = (id: string) => (owned(id) ? credentialOf(saved, id) : undefined)
  const credential = (id: string): Credential | undefined => stored(id) ?? envKey(id)
  const servers = () => serversOf(saved)
  const server = (id: string) => servers().find(found => found.id === id)

  const ready = store.read().then(value => {
    saved = value
    if (ownIds().some(credential) || servers().length) changed()
  })

  const label = (id: string) => plans.get(id)?.label ?? (isKeyKind(id) ? keyLabels[id] : (server(id)?.name ?? id))

  const shared = (id: string) => {
    const found = stored(id) ?? server(id)
    return !!found && found.shared !== false
  }

  const status = (id: string): Status => {
    const waiting = pending.get(id)
    const error = errors.get(id)
    const conflict = conflicts.get(id)
    return { ...(waiting && { pending: waiting }), ...(conflict && { conflict }), ...(error && { error }) }
  }

  const save = async (patch: Saved) => {
    const next: Saved = { ...saved, ...(await store.read()) }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete next[key]
      else next[key] = value
    }
    saved = next
    await store.write(saved)
    changed()
  }

  const saveServers = (list: ServerEntry[]) => save({ servers: list.length ? list : undefined })

  const forget = async (id: string, fromDisk: Saved) => {
    if (credentialOf({ ...saved, ...fromDisk }, id)) await save({ [id]: undefined })
    else changed()
  }

  const settle = (id: string) => {
    pending.delete(id)
    errors.delete(id)
    conflicts.delete(id)
  }

  const keptShare = (id: string) => {
    const before = stored(id)?.shared
    return before === undefined ? {} : { shared: before }
  }

  const rejected = async (id: string, current: OAuth, error: unknown): Promise<Credential> => {
    const fromDisk = await store.read()
    const latest = credentialOf(fromDisk, id)
    if (latest?.type === 'oauth' && latest.refresh !== current.refresh) {
      saved = { ...saved, [id]: latest }
      return latest
    }
    errors.set(id, `Signed out: ${errorMessage(error)}`)
    await forget(id, fromDisk)
    throw new Error(`${label(id)} sign-in expired. ${signInError(label(id)).message}`)
  }

  const renew = async (id: string): Promise<Credential> => {
    const current = credentialOf(await store.read(), id) ?? stored(id)
    if (!current) throw signInError(label(id))
    if (current.type === 'api_key' || fresh(current)) {
      saved = { ...saved, [id]: current }
      return current
    }
    const plan = plans.get(id)
    if (!plan) throw signInError(label(id))
    try {
      const next: OAuth = { ...(await plan.refresh(current)), type: 'oauth', ...(current.shared !== undefined && { shared: current.shared }) }
      errors.delete(id)
      await save({ [id]: next })
      return next
    } catch (error) {
      if (!isRejected(error)) throw error
      return rejected(id, current, error)
    }
  }

  const provider = (id: string) => plans.get(id)?.logo ?? (isKeyKind(id) ? id : (server(id)?.provider ?? 'server'))

  const ownListing = (id: string, signIn?: LoginSignIn) =>
    ownAccount(
      { id, label: label(id), provider: provider(id), ...(signIn && { signIn }) },
      { credential: credential(id), fromEnv: !stored(id), shared: shared(id), status: status(id) },
    )

  return {
    ready,
    servers,
    server,
    label,
    shared,
    provider,
    list: (): LoginAccount[] => [
      ...plans.list().map(plan => ownListing(plan.id, { name: plan.name, detail: plan.detail })),
      ...keyKinds.map(id => ownListing(id)),
      ...servers().map(entry => serverAccount(entry, status(entry.id))),
    ],
    ids: () => [...ownIds().filter(id => !!credential(id)), ...servers().map(found => found.id)],
    signedIn: (id: string) => !!credential(id) || !!server(id),
    known: (id: string) => owned(id) || !!server(id),
    kind(id: string): AccountKind | undefined {
      if (owned(id)) return id
      return server(id) ? 'server' : undefined
    },
    method: (id: string): LoginMethod | undefined => (server(id) ? 'server' : credential(id)?.type),
    api: (id: string): PlanApi | undefined => plans.get(id)?.api ?? (isKeyKind(id) ? keyApis[id] : undefined),
    plan(id: string) {
      const found = credential(id)
      return found?.type === 'oauth' ? found.plan : undefined
    },
    fingerprint(id: string) {
      const entry = server(id)
      if (entry) return `server:${entry.url}:${entry.key ?? ''}`
      const found = credential(id)
      if (found?.type === 'oauth') return `oauth:${found.accountId ?? found.email ?? ''}`
      return found ? `key:${found.key}:${found.base_url ?? ''}` : ''
    },
    async setShared(id: string, value: boolean) {
      await ready
      if (server(id)) return saveServers(servers().map(found => (found.id === id ? { ...found, shared: value } : found)))
      const found = stored(id)
      if (!found) throw new Error(credential(id) ? `This key comes from ${envNames[id]}, so it stays on this PC` : signInError(label(id)).message)
      await save({ [id]: { ...found, shared: value } })
    },
    conflict(id: string, value: LoginConflict | undefined) {
      if (value) conflicts.set(id, value)
      else conflicts.delete(id)
      changed()
    },
    async auth(id: string): Promise<Credential> {
      await ready
      const found = credential(id)
      if (!found || !owned(id)) throw signInError(label(id))
      if (found.type === 'api_key' || fresh(found)) return found
      let running = refreshing.get(id)
      if (!running) {
        running = renew(id).finally(() => refreshing.delete(id))
        refreshing.set(id, running)
      }
      return running
    },
    pend(id: string, waiting: LoginPending | undefined) {
      settle(id)
      if (waiting) pending.set(id, waiting)
      changed()
    },
    fail(id: string, error: unknown) {
      errors.set(id, errorMessage(error))
      changed()
    },
    async signIn(id: string, tokens: PlanTokens) {
      await ready
      settle(id)
      await save({ [id]: { ...tokens, type: 'oauth', ...keptShare(id) } })
    },
    async saveKey(id: KeyKind, key: string, baseUrl = '') {
      await ready
      settle(id)
      await save({ [id]: { type: 'api_key', key, ...(baseUrl && { base_url: baseUrl }), ...keptShare(id) } })
    },
    async saveServer(entry: ServerEntry, error?: string) {
      await ready
      settle(entry.id)
      if (error) errors.set(entry.id, error)
      const list = servers()
      await saveServers(list.some(found => found.id === entry.id) ? list.map(found => (found.id === entry.id ? entry : found)) : [...list, entry])
    },
    async signOut(id: string) {
      await ready
      settle(id)
      if (server(id)) return saveServers(servers().filter(found => found.id !== id))
      if (owned(id)) await forget(id, await store.read())
    },
  }
}
