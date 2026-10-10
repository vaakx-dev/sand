import type { AccountKind, KeyKind, LoginAccount, LoginConflict, LoginPending, SignInKind } from '../contract'
import { refreshClaude } from './anthropic'
import { envKey, envNames } from './env'
import { fixedIds, fixedLabels, isFixed, logos, signInError, type FixedId } from './kinds'
import { fixedAccount, serverAccount, type Status } from './listing'
import { refreshOpenAI } from './openai'
import { TokenError } from './request'
import { displaced, holders, locate } from './slots'
import { authStore, serversOf, type Credential, type OAuth, type Saved, type ServerEntry, type Tokens } from './store'

const refreshers: Record<SignInKind, (tokens: Tokens) => Promise<Tokens>> = { claude: refreshClaude, codex: refreshOpenAI }

const margin = 5 * 60_000

const fresh = (tokens: OAuth) => tokens.expires - Date.now() > margin

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export type Accounts = ReturnType<typeof createAccounts>

export const createAccounts = (path: string, changed: () => void) => {
  const store = authStore(path)
  let saved: Saved = {}
  const pending = new Map<string, LoginPending>()
  const errors = new Map<string, string>()
  const conflicts = new Map<string, LoginConflict>()
  const refreshing = new Map<string, Promise<Credential>>()

  const located = (id: string) => (isFixed(id) ? locate(saved, id) : undefined)
  const stored = (id: string) => located(id)?.credential
  const credential = (id: string): Credential | undefined => stored(id) ?? envKey(id)
  const servers = () => serversOf(saved)
  const server = (id: string) => servers().find(found => found.id === id)

  const ready = store.read().then(value => {
    saved = value
    if (fixedIds.some(credential) || servers().length) changed()
  })

  const signedIn = (id: string) => !!credential(id) || !!server(id)
  const known = (id: string) => isFixed(id) || !!server(id)
  const kind = (id: string): AccountKind | undefined => (isFixed(id) ? id : server(id) ? 'server' : undefined)
  const label = (id: string) => (isFixed(id) ? fixedLabels[id] : (server(id)?.name ?? id))
  const provider = (id: string) => (isFixed(id) ? logos[id] : (server(id)?.provider ?? 'server'))
  const plan = (id: string) => {
    const found = credential(id)
    return found?.type === 'oauth' ? found.plan : undefined
  }

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

  const list = (): LoginAccount[] => [
    ...fixedIds.map(id => fixedAccount(id, { credential: credential(id), fromEnv: !stored(id), shared: shared(id), status: status(id) })),
    ...servers().map(entry => serverAccount(entry, status(entry.id))),
  ]

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

  const settle = (id: string) => {
    pending.delete(id)
    errors.delete(id)
    conflicts.delete(id)
  }

  const keep = (id: string) => {
    const before = stored(id)?.shared
    return before === undefined ? {} : { shared: before }
  }

  const saveServers = (list: ServerEntry[]) => save({ servers: list.length ? list : undefined })

  const rejected = async (id: SignInKind, current: OAuth, error: unknown): Promise<Credential> => {
    const fromDisk = await store.read()
    const latest = locate(fromDisk, id)
    if (latest?.credential.type === 'oauth' && latest.credential.refresh !== current.refresh) {
      saved = { ...saved, [latest.key]: latest.credential }
      return latest.credential
    }
    errors.set(id, `Signed out: ${message(error)}`)
    const keys = holders({ ...saved, ...fromDisk }, id)
    if (keys.length) await save(Object.fromEntries(keys.map(key => [key, undefined])))
    else changed()
    throw new Error(`${fixedLabels[id]} sign-in expired. ${signInError(fixedLabels[id]).message}`)
  }

  const renew = async (id: FixedId): Promise<Credential> => {
    const latest = locate(await store.read(), id) ?? located(id)
    if (!latest) throw signInError(fixedLabels[id])
    const current = latest.credential
    if (current.type === 'api_key' || fresh(current)) {
      saved = { ...saved, [latest.key]: current }
      return current
    }
    if (id !== 'claude' && id !== 'codex') throw signInError(fixedLabels[id])
    try {
      const next: OAuth = { ...(await refreshers[id](current)), type: 'oauth', ...(current.shared !== undefined && { shared: current.shared }) }
      errors.delete(id)
      await save({ [latest.key]: next })
      return next
    } catch (error) {
      if (!(error instanceof TokenError && error.rejected)) throw error
      return rejected(id, current, error)
    }
  }

  return {
    ready,
    list,
    ids: () => [...fixedIds.filter(id => !!credential(id)), ...servers().map(found => found.id)],
    signedIn,
    known,
    kind,
    label,
    provider,
    plan,
    shared,
    credential,
    server,
    servers,
    fingerprint(id: string) {
      const found = credential(id)
      const entry = server(id)
      if (entry) return `server:${entry.url}:${entry.key ?? ''}`
      if (found?.type === 'oauth') return `oauth:${found.accountId ?? found.email ?? ''}`
      return found ? `key:${found.key}:${found.base_url ?? ''}` : ''
    },
    async setShared(id: string, value: boolean) {
      await ready
      const entry = server(id)
      if (entry) return saveServers(servers().map(found => (found.id === id ? { ...found, shared: value } : found)))
      const found = located(id)
      if (!found) throw new Error(credential(id) ? `This key comes from ${envNames[id]}, so it stays on this PC` : signInError(label(id)).message)
      await save({ [found.key]: { ...found.credential, shared: value } })
    },
    conflict(id: string, value: LoginConflict | undefined) {
      if (value) conflicts.set(id, value)
      else conflicts.delete(id)
      changed()
    },
    async auth(id: string): Promise<Credential> {
      await ready
      const found = credential(id)
      if (!found || !isFixed(id)) throw signInError(label(id))
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
      errors.set(id, message(error))
      changed()
    },
    async signIn(id: SignInKind, tokens: Tokens) {
      await ready
      settle(id)
      await save({ [id]: { ...tokens, type: 'oauth', ...keep(id) } })
    },
    async saveKey(id: KeyKind, key: string, baseUrl = '') {
      await ready
      settle(id)
      await save({ ...displaced(saved, id), [id]: { type: 'api_key', key, ...(baseUrl && { base_url: baseUrl }), ...keep(id) } })
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
      if (!isFixed(id)) return
      const keys = holders({ ...saved, ...(await store.read()) }, id)
      if (keys.length) await save(Object.fromEntries(keys.map(key => [key, undefined])))
      else changed()
    },
  }
}
