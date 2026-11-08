import { GitHubError } from '../api/errors'
import { readToken, type TokenSource } from './token'
import { checkUser } from './user'

const signedInMs = 5 * 60_000
const otherwiseMs = 30_000

type Known = { token: string; until: number } | { token?: undefined; problem: string; until: number }

export interface Auth {
  token(): Promise<string>
  invalidate(): void
}

const signInHint = 'sign in with gh auth login, or set GH_TOKEN'

const later = (ms: number) => Date.now() + ms

const settle = async (source: TokenSource): Promise<Known> => {
  if (source.token === undefined) {
    const problem = source.failed ?? (source.gh ? `This PC isn't signed in to GitHub; ${signInHint}.` : 'GitHub needs the GitHub CLI (gh) on this PC, or a GH_TOKEN; install gh and sign in.')
    return { problem, until: later(otherwiseMs) }
  }
  const user = await checkUser(source.token)
  if (user.ok) return { token: source.token, until: later(signedInMs) }
  if (!user.rejected) return { problem: user.message, until: later(otherwiseMs) }
  if (source.from === 'gh') return { problem: `GitHub didn't accept this PC's gh sign-in; ${signInHint}.`, until: later(otherwiseMs) }
  return { problem: "GitHub didn't accept the GH_TOKEN or GITHUB_TOKEN set on this PC; replace it, or remove it to use gh.", until: later(otherwiseMs) }
}

export const createAuth = (host: string): Auth => {
  let known: Known | undefined
  let loading: Promise<Known> | undefined

  const load = () => {
    loading ??= readToken(host)
      .then(settle)
      .then(next => {
        known = next
        return next
      })
      .finally(() => {
        loading = undefined
      })
    return loading
  }

  const current = () => (known && known.until > Date.now() ? Promise.resolve(known) : load())

  return {
    async token() {
      const found = await current()
      if (found.token !== undefined) return found.token
      throw new GitHubError(found.problem)
    },
    invalidate() {
      known = undefined
    },
  }
}
