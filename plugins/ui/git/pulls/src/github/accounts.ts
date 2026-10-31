import type { GitHubAuth } from '@sand/github/contract'
import { errorMessage } from '@sand/util'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { PullsContext } from '../inject'
import { onReconnect } from '../reconnect'

export const githubAccounts = (ctx: PullsContext) => {
  const auths = new Map<string, Sig<GitHubAuth | undefined>>()
  const loading = new Set<string>()

  const slot = (device: string) => {
    const found = auths.get(device)
    if (found) return found
    const made = sig<GitHubAuth | undefined>(undefined)
    auths.set(device, made)
    return made
  }

  const load = async (device: string) => {
    if (loading.has(device)) return
    loading.add(device)
    const auth = slot(device)
    try {
      auth.set(await ctx.github.auth(device))
    } catch (error) {
      auth.set({ state: 'error', message: errorMessage(error) })
    } finally {
      loading.delete(device)
    }
  }

  const of = (device: string) => {
    if (!auths.has(device)) void load(device)
    return slot(device).get()
  }

  const set = (device: string, auth: GitHubAuth) => slot(device).set(auth)

  const signedIn = (device: string) => of(device)?.state === 'signed-in'

  ctx.effect(() =>
    ctx.github.onAuthChange((next, device) => {
      if (auths.has(device)) set(device, next)
    }),
  )
  onReconnect(ctx, device => {
    for (const each of auths.keys()) if (!device || each === device) void load(each)
  })

  return { of, set, load, signedIn }
}

export type GitHubAccounts = ReturnType<typeof githubAccounts>
