import type { GitHubAuth, GitHubLoginCode } from '@sand/github/contract'
import { errorMessage } from '@sand/util'
import { batch, sig } from '@vaakx-dev/vrui'
import type { PullsContext } from '../inject'

const stillSignedIn = 'Still signed in: the token comes from GITHUB_TOKEN where sand runs on that PC. Remove it there to sign out.'

const signInFor = (ctx: PullsContext, device: string) => {
  const { github } = ctx
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
      await github.login(device)
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
      return void github.auth(device)
    }
    if (next.state === 'signed-in' && next.from === 'env') note.set(stillSignedIn)
  }

  const logout = async () => {
    if (leaving.get()) return
    reset()
    leaving.set(true)
    try {
      settleLogout(await github.logout(device))
    } catch (error) {
      failure.set(errorMessage(error))
    } finally {
      leaving.set(false)
    }
  }

  return { device, auth: () => github.authOf(device), code, signing, leaving, failure, note, login, logout, check: () => github.auth(device) }
}

export type GitHubSignIn = ReturnType<typeof signInFor>

export const githubSignIns = (ctx: PullsContext) => {
  const signIns = new Map<string, GitHubSignIn>()

  const of = (device: string) => {
    const found = signIns.get(device)
    if (found) return found
    const made = signInFor(ctx, device)
    signIns.set(device, made)
    return made
  }

  ctx.effect(() =>
    ctx.github.onLoginCode((next, device) => {
      const found = signIns.get(device)
      if (found?.signing.get()) found.code.set(next)
    }),
  )

  return { of }
}

export type GitHubSignIns = ReturnType<typeof githubSignIns>
