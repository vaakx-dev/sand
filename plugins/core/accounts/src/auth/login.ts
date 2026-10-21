import type { DetectedServer, KeyKind, LoginPending, PlanTokens, ServerDraft, SignInFlow } from '../contract'
import { trimSlash } from '@sand/util'
import { detectServers } from '../discover'
import type { Accounts } from './accounts'
import type { PlanRegistry } from './plans'
import { checkServer, serverEntry } from './servers'

type Flow = SignInFlow<PlanTokens | void>

const pendingOf = (started: Flow): LoginPending => {
  if (started.kind === 'device') return { kind: 'device', url: started.url, code: started.code, expires: started.expires }
  return { kind: started.kind, url: started.url }
}

export type Login = ReturnType<typeof createLogin>

export const createLogin = (accounts: Accounts, plans: PlanRegistry) => {
  const running = new Map<string, AbortController>()
  const pastes = new Map<string, (code: string) => Promise<PlanTokens | void>>()

  const stop = (account: string) => {
    running.get(account)?.abort()
    running.delete(account)
    pastes.delete(account)
  }

  const complete = async (account: string, tokens: PlanTokens | void) => {
    if (tokens) return accounts.signIn(account, tokens)
    await plans.refresh(account)
    accounts.pend(account, undefined)
  }

  const wait = (account: string, controller: AbortController, tokens: Promise<PlanTokens | void>) =>
    tokens
      .then(found => (controller.signal.aborted ? undefined : complete(account, found)))
      .catch(error => {
        if (controller.signal.aborted) return
        accounts.pend(account, undefined)
        accounts.fail(account, error)
      })
      .finally(() => {
        if (running.get(account) === controller) running.delete(account)
      })

  const begin = async (account: string) => {
    const plan = plans.get(account)
    if (!plan) throw new Error(`Unknown account "${account}"`)
    stop(account)
    const controller = new AbortController()
    running.set(account, controller)
    const started: Flow = await plan.signIn(controller.signal)
    if (controller.signal.aborted) return
    accounts.pend(account, pendingOf(started))
    if (started.kind === 'paste') pastes.set(account, started.finish)
    if (started.wait) void wait(account, controller, started.wait())
  }

  const start = async (account: string) => {
    try {
      await begin(account)
    } catch (error) {
      accounts.fail(account, error)
    }
  }

  const finish = async (account: string, code: string) => {
    const paste = pastes.get(account)
    if (!paste) return accounts.fail(account, 'Start signing in first')
    try {
      await complete(account, await paste(code))
      stop(account)
    } catch (error) {
      accounts.fail(account, error)
    }
  }

  const cancel = (account: string) => {
    stop(account)
    accounts.pend(account, undefined)
  }

  const key = async (account: KeyKind, value: string, baseUrl = '') => {
    if (!value) return accounts.fail(account, 'Enter an API key')
    if (baseUrl && !/^https?:\/\/[^\s/]+/i.test(baseUrl)) return accounts.fail(account, 'Base URL must start with http:// or https://')
    cancel(account)
    await accounts.saveKey(account, value, baseUrl)
  }

  const server = async (draft: ServerDraft) => {
    await accounts.ready
    const entry = serverEntry(draft, accounts.servers(), accounts.known)
    await accounts.saveServer(entry, await checkServer(entry))
  }

  const detect = async (): Promise<DetectedServer[]> => {
    await accounts.ready
    const added = new Set(accounts.servers().map(found => found.url))
    return (await detectServers()).filter(found => !added.has(trimSlash(found.url)))
  }

  const logout = async (account: string) => {
    cancel(account)
    const app = plans.app(account)
    if (!app) return accounts.signOut(account)
    await app.signOut()
    await plans.refresh(account)
  }

  const dispose = () => [...running.keys()].forEach(stop)

  return { start, finish, key, server, detect, cancel, logout, dispose }
}
