import type { LoginAccount, LoginConflict, LoginPending, LoginProvider } from '@sand/protocol'
import { refreshClaude } from './anthropic'
import { envKey, envNames } from './env'
import { refreshOpenAI } from './openai'
import { TokenError } from './request'
import { authStore, credentialOf, type Credential, type OAuth, type Saved, type Tokens } from './store'

export const providers: LoginProvider[] = ['anthropic', 'openai']

export const labels: Record<LoginProvider, string> = { anthropic: 'Anthropic', openai: 'OpenAI' }

export const subscriptions: Record<LoginProvider, string> = { anthropic: 'Claude', openai: 'ChatGPT' }

const refreshers: Record<LoginProvider, (tokens: Tokens) => Promise<Tokens>> = { anthropic: refreshClaude, openai: refreshOpenAI }

const margin = 5 * 60_000

const fresh = (tokens: OAuth) => tokens.expires - Date.now() > margin

export const accountName = (provider: LoginProvider, method?: string) => (method === 'oauth' ? subscriptions[provider] : labels[provider])

export const settingsPath = 'Settings → Accounts'

export const signInError = (provider?: LoginProvider) => new Error(`Sign in${provider ? ` to ${labels[provider]}` : ''} under ${settingsPath}`)

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export type Accounts = ReturnType<typeof createAccounts>

export const createAccounts = (path: string, changed: () => void) => {
  const store = authStore(path)
  let saved: Saved = {}
  const pending = new Map<LoginProvider, LoginPending>()
  const errors = new Map<LoginProvider, string>()
  const conflicts = new Map<LoginProvider, LoginConflict>()
  const refreshing = new Map<LoginProvider, Promise<Credential>>()

  const stored = (provider: LoginProvider) => credentialOf(saved, provider)
  const credential = (provider: LoginProvider): Credential | undefined => stored(provider) ?? envKey(provider)

  const ready = store.read().then(value => {
      saved = value
      if (providers.some(credential)) changed()
    })

  const shared = (provider: LoginProvider) => {
    const found = stored(provider)
    return !!found && found.shared !== false
  }
  const keep = (provider: LoginProvider) => {
    const before = stored(provider)?.shared
    return before === undefined ? {} : { shared: before }
  }

  const account = (provider: LoginProvider): LoginAccount => {
    const found = credential(provider)
    const oauth = found?.type === 'oauth' ? found : undefined
    const waiting = pending.get(provider)
    const error = errors.get(provider)
    const conflict = conflicts.get(provider)
    return {
      provider,
      label: labels[provider],
      subscription: subscriptions[provider],
      signedIn: !!found,
      shared: shared(provider),
      ...(found && { method: found.type }),
      ...(found && !stored(provider) && { env: envNames[provider] }),
      ...(oauth?.email && { email: oauth.email }),
      ...(oauth?.plan && { plan: oauth.plan }),
      ...(waiting && { pending: waiting }),
      ...(conflict && { conflict }),
      ...(error && { error }),
    }
  }

  const save = async (name: string, next: unknown) => {
    const { [name]: _, ...rest } = { ...saved, ...(await store.read()) }
    saved = next === undefined ? rest : { ...rest, [name]: next }
    await store.write(saved)
    changed()
  }

  const renew = async (provider: LoginProvider): Promise<Credential> => {
    const current = credentialOf(await store.read(), provider) ?? stored(provider)
    if (!current) throw signInError(provider)
    if (current.type === 'api_key' || fresh(current)) {
      saved = { ...saved, [provider]: current }
      return current
    }
    try {
      const next: OAuth = { ...(await refreshers[provider](current)), type: 'oauth', ...(current.shared !== undefined && { shared: current.shared }) }
      errors.delete(provider)
      await save(provider, next)
      return next
    } catch (error) {
      if (!(error instanceof TokenError && error.rejected)) throw error
      errors.set(provider, `Signed out: ${message(error)}`)
      await save(provider, undefined)
      throw new Error(`${subscriptions[provider]} sign-in expired. ${signInError(provider).message}`)
    }
  }

  return {
    ready,
    list: () => providers.map(account),
    signedIn: (provider: LoginProvider) => !!credential(provider),
    shared,
    credential,
    async setShared(provider: LoginProvider, value: boolean) {
      await ready
      const found = stored(provider)
      if (!found) throw new Error(credential(provider) ? `This key comes from ${envNames[provider]}, so it stays on this PC` : signInError(provider).message)
      await save(provider, { ...found, shared: value })
    },
    conflict(provider: LoginProvider, value: LoginConflict | undefined) {
      if (value) conflicts.set(provider, value)
      else conflicts.delete(provider)
      changed()
    },
    async auth(provider: LoginProvider): Promise<Credential> {
      await ready
      const found = credential(provider)
      if (!found) throw signInError(provider)
      if (found.type === 'api_key' || fresh(found)) return found
      let running = refreshing.get(provider)
      if (!running) {
        running = renew(provider).finally(() => refreshing.delete(provider))
        refreshing.set(provider, running)
      }
      return running
    },
    pend(provider: LoginProvider, waiting: LoginPending | undefined) {
      if (waiting) pending.set(provider, waiting)
      else pending.delete(provider)
      errors.delete(provider)
      conflicts.delete(provider)
      changed()
    },
    fail(provider: LoginProvider, error: unknown) {
      errors.set(provider, message(error))
      changed()
    },
    async signIn(provider: LoginProvider, tokens: Tokens) {
      await ready
      pending.delete(provider)
      errors.delete(provider)
      conflicts.delete(provider)
      await save(provider, { ...tokens, type: 'oauth', ...keep(provider) })
    },
    async saveKey(provider: LoginProvider, key: string, baseUrl = '') {
      await ready
      pending.delete(provider)
      errors.delete(provider)
      conflicts.delete(provider)
      await save(provider, { type: 'api_key', key, ...(baseUrl && { base_url: baseUrl }), ...keep(provider) })
    },
    async signOut(provider: LoginProvider) {
      await ready
      pending.delete(provider)
      errors.delete(provider)
      conflicts.delete(provider)
      await save(provider, undefined)
    },
  }
}
