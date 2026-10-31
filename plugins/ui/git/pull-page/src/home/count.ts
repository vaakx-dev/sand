import { wireHello } from '@sand/devices-contract'
import { effect, sig } from '@vaakx-dev/vrui'
import type { PageContext } from '../inject'
import type { HomeAuth } from './auth'

export const needsCount = (ctx: PageContext, auth: HomeAuth) => {
  const count = sig(0)

  const load = () => {
    auth.changes.get()
    if (!auth.signedIn.get()) {
      count.set(0)
      return
    }
    void ctx.inbox
      .count()
      .then(found => count.set(found.count))
      .catch(() => undefined)
  }

  ctx.effect(() => ctx.inbox.onCount(found => count.set(found.count)))
  ctx.on(wireHello, load)
  ctx.effect(() => effect(load))

  return count
}
