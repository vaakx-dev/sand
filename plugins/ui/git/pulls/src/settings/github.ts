import { type GitHubAuth, githubLogin, type GitHubLoginCode, githubLoginCode, githubLogout } from '@sand/github/contract'
import { errorMessage } from '@sand/util'
import { batch, sig } from '@vaakx-dev/vrui'
import type { GitHubAccounts } from '../github/accounts'
import type { PullsContext } from '../inject'

const stillSignedIn = 'Still signed in: the token comes from GITHUB_TOKEN where sand runs on that PC. Remove it there to sign out.'

const signInFor = (ctx: PullsContext, accounts: GitHubAccounts, device: string) => {
  const code = sig<GitHubLoginCode | undefined>(undefined)
  const signing = sig(false)
  const leaving = sig(false)
  const failure = sig('')
  const note = sig('')

  const reset = () =>
    batch(() => {
      failure.set('')
      note.set('')
    })

  const login = async () => {
    if (signing.get()) return
    reset()
    batch(() => {
      signing.set(true)
      code.set(undefined)
    })
    try {
      accounts.set(device, await ctx.wire.call(githubLogin, {}, device))
    } catch (error) {
      failure.set(errorMessage(error))
    } finally {
      batch(() => {
        signing.set(false)
        code.set(undefined)
      })
    }
  }

  const settleLogout = (next: GitHubAuth) => {
    if (next.state === 'error') {
      failure.set(next.message)
      return void accounts.load(device)
    }
    accounts.set(device, next)
    if (next.state === 'signed-in' && next.from === 'env') note.set(stillSignedIn)
  }

  const logout = async () => {
    if (leaving.get()) return
    reset()
    leaving.set(true)
    try {
      settleLogout(await ctx.wire.call(githubLogout, {}, device))
    } catch (error) {
      failure.set(errorMessage(error))
    } finally {
      leaving.set(false)
    }
  }

  return { device, auth: () => accounts.of(device), code, signing, leaving, failure, note, login, logout, check: () => accounts.load(device) }
}

export type GitHubSignIn = ReturnType<typeof signInFor>

export const githubSignIns = (ctx: PullsContext, accounts: GitHubAccounts) => {
  const signIns = new Map<string, GitHubSignIn>()

  const of = (device: string) => {
    const found = signIns.get(device)
    if (found) return found
    const made = signInFor(ctx, accounts, device)
    signIns.set(device, made)
    return made
  }

  ctx.effect(() =>
    ctx.wire.on(
      githubLoginCode,
      (next, device) => {
        const found = signIns.get(device)
        if (found?.signing.get()) found.code.set(next)
      },
      { from: 'all' },
    ),
  )

  return { of }
}

export type GitHubSignIns = ReturnType<typeof githubSignIns>
