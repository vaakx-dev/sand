import type { GithubCli, GithubFound, GithubState } from './contract'
import { createFlow } from './flow'
import { ghLogin, ghToken, loginOf } from './gh/login'
import { ghCli } from './gh/version'
import { pairedPcs, syncPeers } from './share/peers'
import type { ShareSide } from './share/route'
import { authFile, githubStore, isSignedIn, timeOf, type GithubRecord } from './store'

export interface LoginOptions {
  home: string
  changed(): void
}

export const createGithubLogin = async ({ home, changed }: LoginOptions) => {
  const store = githubStore(await authFile(home))
  let record = await store.read()
  let pcs = 1
  let cli: GithubCli = { installed: true, old: false }
  let syncing: Promise<void> | undefined

  const save = async (next: GithubRecord) => {
    record = next
    await store.write(next)
    changed()
  }

  const signedIn = () => (isSignedIn(record) ? record : undefined)

  const shared = (): GithubRecord | undefined => {
    if (!isSignedIn(record)) return record
    const { login, token, at } = record
    return { login, token, at }
  }

  const receive: ShareSide['receive'] = async (incoming, from) => {
    if (timeOf(incoming) <= timeOf(record)) return
    await save(isSignedIn(incoming) ? { login: incoming.login, token: incoming.token, at: incoming.at, from } : incoming)
  }

  const sync = () =>
    (syncing ??= syncPeers(home, { shared, receive })
      .then(count => {
        pcs = count + 1
        changed()
      })
      .finally(() => (syncing = undefined)))

  const signIn = async (token: string) => {
    const login = await loginOf(token)
    await save({ login, token, at: Date.now() })
    void sync()
  }

  const flow = createFlow({ changed, signIn })

  const state = (): GithubState => {
    const found = signedIn()
    const pending = flow.pending()
    const error = flow.error()
    return {
      ...(found && { login: found.login, ...(found.from && { from: found.from.name }) }),
      pcs,
      gh: cli,
      ...(pending && { pending }),
      ...(error && { error }),
    }
  }

  return {
    state,
    shared,
    receive,
    sync,
    token: () => signedIn()?.token,
    async status() {
      const [found, remotes] = await Promise.all([ghCli(), pairedPcs(home).catch(() => [])])
      cli = found
      pcs = remotes.length + 1
      return state()
    },
    find: async (): Promise<GithubFound> => {
      const login = await ghLogin()
      return login ? { login } : {}
    },
    async use() {
      flow.cancel()
      await signIn(await ghToken())
      return state()
    },
    async start() {
      await flow.start()
      return state()
    },
    cancel() {
      flow.cancel()
      changed()
      return state()
    },
    async logout() {
      flow.cancel()
      await save({ out: Date.now() })
      void sync()
      return state()
    },
    dispose: () => flow.cancel(),
  }
}

export type GithubLogin = Awaited<ReturnType<typeof createGithubLogin>>
