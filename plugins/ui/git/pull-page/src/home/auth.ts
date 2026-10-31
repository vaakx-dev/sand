import { wireHello } from '@sand/devices-contract'
import type { GitHubAuth } from '@sand/github/contract'
import { sig } from '@vaakx-dev/vrui'
import { hereOf, type PageContext } from '../inject'

export const homeAuth = (ctx: PageContext) => {
  const auth = sig<GitHubAuth | undefined>(undefined)
  const changes = sig(0)

  const load = () =>
    ctx.github
      .auth(hereOf(ctx))
      .then(next => auth.set(next))
      .catch(() => undefined)

  ctx.effect(() =>
    ctx.github.onAuthChange((next, device) => {
      if (device !== hereOf(ctx)) return
      auth.set(next)
      changes.update(count => count + 1)
    }),
  )
  ctx.on(wireHello, () => void load())
  void load()

  return { auth, changes, signedIn: auth.map(found => found?.state === 'signed-in') }
}

export type HomeAuth = ReturnType<typeof homeAuth>
