import type { Server } from '@sand/server/contract'
import type { LoginConflict, LoginProvider, LoginState } from './contract'
import { providers, type Accounts } from './auth/accounts'
import type { Login } from './auth/login'

const checked = (provider: LoginProvider) => {
  if (!providers.includes(provider)) throw new Error(`Unknown account "${provider}"`)
  return provider
}

export interface LoginExtras {
  state(): LoginState
  load(): Promise<void>
  conflict(provider: LoginProvider): LoginConflict | undefined
}

export const serveLogin = (server: Server, accounts: Accounts, login: Login, extras: LoginExtras) => {
  const then =
    <T>(run: (request: T) => Promise<unknown>) =>
    async (request: T) => {
      await run(request)
      return extras.state()
    }
  const start = async (provider: LoginProvider, anyway: boolean) => {
    const conflict = anyway ? undefined : extras.conflict(provider)
    if (conflict) return accounts.conflict(provider, conflict)
    await login.start(provider)
  }
  const disposers = [
    server.handle(
      'login.status',
      then(async () => {
        await accounts.ready
        await extras.load()
      }),
    ),
    server.handle('login.start', then(({ provider, anyway }) => start(checked(provider), anyway === true))),
    server.handle('login.finish', then(({ provider, code }) => login.finish(checked(provider), String(code ?? '')))),
    server.handle('login.key', then(({ provider, key, baseUrl }) => login.key(checked(provider), String(key ?? '').trim(), String(baseUrl ?? '').trim()))),
    server.handle('login.cancel', then(async ({ provider }) => login.cancel(checked(provider)))),
    server.handle('login.logout', then(({ provider }) => login.logout(checked(provider)))),
    server.handle('login.shared', then(({ provider, shared }) => accounts.setShared(checked(provider), shared === true))),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
