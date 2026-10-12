import type { Server } from '@sand/server/contract'
import type { KeyKind, LoginConflict, LoginState, ServerDraft } from '../contract'
import type { Accounts } from '../auth/accounts'
import { isKeyKind } from '../auth/kinds'
import type { Login } from '../auth/login'
import type { PlanRegistry } from '../auth/plans'

interface LoginExtras {
  plans: PlanRegistry
  state(): LoginState
  load(): Promise<void>
  conflict(account: string): LoginConflict | undefined
}

const unknown = (account: unknown) => new Error(`Unknown account "${String(account)}"`)

const keyKind = (account: unknown): KeyKind => {
  if (!isKeyKind(account)) throw unknown(account)
  return account
}

const draftOf = ({ id, name, url, key, provider }: ServerDraft): ServerDraft => ({
  ...(typeof id === 'string' && id && { id }),
  name: String(name ?? ''),
  url: String(url ?? ''),
  ...(typeof key === 'string' && { key }),
  ...(provider && { provider }),
})

export const serveLogin = (server: Server, accounts: Accounts, login: Login, extras: LoginExtras) => {
  const known = async (account: unknown) => {
    await accounts.ready
    if (typeof account !== 'string' || !accounts.known(account)) throw unknown(account)
    return account
  }

  const planId = (account: unknown) => {
    if (typeof account !== 'string' || !extras.plans.get(account)) throw unknown(account)
    return account
  }

  const withState =
    <T>(run: (request: T) => Promise<unknown>) =>
    async (request: T) => {
      await run(request)
      return extras.state()
    }

  const start = async (account: string, anyway: boolean) => {
    const conflict = anyway ? undefined : extras.conflict(account)
    if (conflict) return accounts.conflict(account, conflict)
    await login.start(account)
  }

  return server.handle({
    'login.status': withState(async () => {
      await accounts.ready
      await extras.load()
    }),
    'login.start': withState(({ account, anyway }) => start(planId(account), anyway === true)),
    'login.finish': withState(({ account, code }) => login.finish(planId(account), String(code ?? ''))),
    'login.key': withState(({ account, key, baseUrl }) => login.key(keyKind(account), String(key ?? '').trim(), String(baseUrl ?? '').trim())),
    'login.server': withState(request => login.server(draftOf(request))),
    'login.detect': () => login.detect(),
    'login.cancel': withState(async ({ account }) => login.cancel(await known(account))),
    'login.logout': withState(async ({ account }) => login.logout(await known(account))),
    'login.shared': withState(async ({ account, shared }) => accounts.setShared(await known(account), shared === true)),
  })
}
