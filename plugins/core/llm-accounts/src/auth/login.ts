import type { DetectedServer, KeyKind, PlanSignIn, PlanTokens, ServerDraft } from '../contract'
import { trimSlash } from '@sand/kit'
import { detectServers } from '../discover'
import type { Accounts } from './accounts'
import type { PlanRegistry } from './plans'
import { checkServer, serverEntry } from './servers'

type Paste = Extract<PlanSignIn, { kind: 'paste' }>

export type Login = ReturnType<typeof createLogin>

export const createLogin = (accounts: Accounts, plans: PlanRegistry) => {
  const running = new Map<string, AbortController>()
  const pastes = new Map<string, Paste['finish']>()

  const stop = (account: string) => {
    running.get(account)?.abort()
    running.delete(account)
    pastes.delete(account)
  }

  const wait = (account: string, controller: AbortController, tokens: Promise<PlanTokens>) =>
    tokens
      .then(found => (controller.signal.aborted ? undefined : accounts.signIn(account, found)))
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
    const started = await plan.signIn(controller.signal)
    if (controller.signal.aborted) return
    if (started.kind === 'paste') {
      pastes.set(account, started.finish)
      return accounts.pend(account, { kind: 'paste', url: started.url })
    }
    accounts.pend(account, { kind: 'device', url: started.url, code: started.code, expires: started.expires })
    void wait(account, controller, started.wait())
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
      await accounts.signIn(account, await paste(code))
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
    await accounts.signOut(account)
  }

  const dispose = () => [...running.keys()].forEach(stop)

  return { start, finish, key, server, detect, cancel, logout, dispose }
}
