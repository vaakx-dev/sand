import { GitHubError } from '../api/errors'
import type { GitHubAuth } from '../contract'
import { readToken, type TokenSource } from './token'
import { checkUser } from './user'

const signedInMs = 5 * 60_000
const otherwiseMs = 30_000

interface Known {
  auth: GitHubAuth
  token?: string
  until: number
}

export interface Auth {
  auth(): Promise<GitHubAuth>
  token(): Promise<string>
  reload(): Promise<GitHubAuth>
  invalidate(): void
}

const missingError = (auth: GitHubAuth) => {
  if (auth.state === 'error') return new GitHubError(auth.message)
  if (auth.state === 'signed-out' && !auth.gh) return new GitHubError('GitHub needs the GitHub CLI (gh) on this PC, or a GH_TOKEN; install gh and sign in.', 401)
  return new GitHubError("This PC isn't signed in to GitHub; sign in under Settings → Git.", 401)
}

const later = (ms: number) => Date.now() + ms

const settle = async (host: string, source: TokenSource): Promise<Known> => {
  if (source.token === undefined) return { auth: { state: 'signed-out', gh: source.gh }, until: later(otherwiseMs) }
  const user = await checkUser(source.token)
  if (user.ok) return { auth: { state: 'signed-in', login: user.login, host, from: source.from }, token: source.token, until: later(signedInMs) }
  if (!user.rejected) return { auth: { state: 'error', message: user.message }, token: source.token, until: later(otherwiseMs) }
  if (source.from === 'gh') return { auth: { state: 'signed-out', gh: true }, until: later(otherwiseMs) }
  return { auth: { state: 'error', message: "GitHub didn't accept the GH_TOKEN or GITHUB_TOKEN set on this PC; replace it, or remove it to use gh." }, until: later(otherwiseMs) }
}

export const createAuth = (host: string, changed: (auth: GitHubAuth) => void): Auth => {
  let known: Known | undefined
  let loading: Promise<Known> | undefined
  let announced: string | undefined

  const load = (always: boolean) => {
    if (loading) return loading
    const reading = readToken(host)
      .then(source => settle(host, source))
      .then(next => {
        known = next
        const shown = JSON.stringify(next.auth)
        if (always || (announced !== undefined && announced !== shown)) changed(next.auth)
        announced = shown
        return next
      })
      .finally(() => {
        loading = undefined
      })
    loading = reading
    return reading
  }

  const current = () => (known && known.until > Date.now() ? Promise.resolve(known) : load(false))

  return {
    auth: () => current().then(found => found.auth),
    async token() {
      const found = await current()
      if (found.token) return found.token
      throw missingError(found.auth)
    },
    async reload() {
      await loading?.catch(() => undefined)
      known = undefined
      return (await load(true)).auth
    },
    invalidate() {
      known = undefined
    },
  }
}
