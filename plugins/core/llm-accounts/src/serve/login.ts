import type { Server } from '@sand/server/contract'
import type { KeyKind, LoginConflict, LoginState, ServerDraft, SignInKind } from '../contract'
import type { Accounts } from '../auth/accounts'
import { isKeyKind, isSignInKind } from '../auth/kinds'
import type { Login } from '../auth/login'

export interface LoginExtras {
  state(): LoginState
  load(): Promise<void>
  conflict(account: SignInKind): LoginConflict | undefined
}

const unknown = (account: unknown) => new Error(`Unknown account "${String(account)}"`)

export const serveLogin = (server: Server, accounts: Accounts, login: Login, extras: LoginExtras) => {
  const signIn = (account: unknown): SignInKind => {
    if (!isSignInKind(account)) throw unknown(account)
    return account
  }
  const keyed = (account: unknown): KeyKind => {
    if (!isKeyKind(account)) throw unknown(account)
    return account
  }
  const known = async (account: unknown) => {
    await accounts.ready
    if (typeof account !== 'string' || !accounts.known(account)) throw unknown(account)
    return account
  }
  const then =
    <T>(run: (request: T) => Promise<unknown>) =>
    async (request: T) => {
      await run(request)
      return extras.state()
    }
  const start = async (account: SignInKind, anyway: boolean) => {
    const conflict = anyway ? undefined : extras.conflict(account)
    if (conflict) return accounts.conflict(account, conflict)
    await login.start(account)
  }
  const draft = ({ id, name, url, key, provider }: ServerDraft): ServerDraft => ({
    ...(typeof id === 'string' && id && { id }),
    name: String(name ?? ''),
    url: String(url ?? ''),
    ...(typeof key === 'string' && { key }),
    ...(provider && { provider }),
  })

  const disposers = [
    server.handle(
      'login.status',
      then(async () => {
        await accounts.ready
        await extras.load()
      }),
    ),
    server.handle('login.start', then(({ account, anyway }) => start(signIn(account), anyway === true))),
    server.handle('login.finish', then(({ account, code }) => login.finish(signIn(account), String(code ?? '')))),
    server.handle('login.key', then(({ account, key, baseUrl }) => login.key(keyed(account), String(key ?? '').trim(), String(baseUrl ?? '').trim()))),
    server.handle('login.server', then(request => login.server(draft(request)))),
    server.handle('login.detect', () => login.detect()),
    server.handle('login.cancel', then(async ({ account }) => login.cancel(await known(account)))),
    server.handle('login.logout', then(async ({ account }) => login.logout(await known(account)))),
    server.handle('login.shared', then(async ({ account, shared }) => accounts.setShared(await known(account), shared === true))),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
