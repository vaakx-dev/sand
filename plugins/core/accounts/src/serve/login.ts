import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import {
  loginCancel,
  loginDetect,
  loginFinish,
  loginKey,
  loginLogout,
  loginServer,
  loginShared,
  loginStart,
  loginStatus,
  type LoginConflict,
  type LoginState,
} from '../contract'
import type { Accounts } from '../auth/accounts'
import type { Login } from '../auth/login'
import type { PlanRegistry } from '../auth/plans'

interface LoginExtras {
  plans: PlanRegistry
  state(): LoginState
  load(): Promise<void>
  conflict(account: string): LoginConflict | undefined
}

const unknown = (account: string) => new Error(`Unknown account "${account}"`)

export const serveLogin = (server: Server, accounts: Accounts, login: Login, extras: LoginExtras) => {
  const known = async (account: string) => {
    await accounts.ready
    if (!accounts.known(account)) throw unknown(account)
    return account
  }

  const planId = (account: string) => {
    if (!extras.plans.get(account)) throw unknown(account)
    return account
  }

  const withState =
    <T>(run: (input: T) => Promise<unknown>) =>
    async (input: T) => {
      await run(input)
      return extras.state()
    }

  const start = async (account: string, anyway: boolean) => {
    const conflict = anyway ? undefined : extras.conflict(account)
    if (conflict) return accounts.conflict(account, conflict)
    await login.start(account)
  }

  return joinDisposers(
    server.handle(
      loginStatus,
      withState(async () => {
        await accounts.ready
        await extras.load()
      }),
    ),
    server.handle(loginStart, withState(({ account, anyway }) => start(planId(account), anyway === true))),
    server.handle(loginFinish, withState(({ account, code }) => login.finish(planId(account), code))),
    server.handle(loginKey, withState(({ account, key, baseUrl }) => login.key(account, key.trim(), (baseUrl ?? '').trim()))),
    server.handle(loginServer, withState(draft => login.server(draft))),
    server.handle(loginDetect, () => login.detect()),
    server.handle(loginCancel, withState(async ({ account }) => login.cancel(await known(account)))),
    server.handle(loginLogout, withState(async ({ account }) => login.logout(await known(account)))),
    server.handle(loginShared, withState(async ({ account, shared }) => accounts.setShared(await known(account), shared))),
  )
}
