import { pcHello } from '@sand/devices-contract'
import { type Derive, effect, sig } from '@vaakx-dev/vrui'
import { hereOf, type PageContext } from '../inject'

export const needsCount = (ctx: PageContext, account: Derive<string>) => {
  const count = sig(0)

  const load = () => {
    if (!account.get()) return count.set(0)
    ctx.inbox
      .count()
      .then(found => count.set(found.count))
      .catch(error => ctx.report(error))
  }

  ctx.effect(() => ctx.inbox.onCount(found => count.set(found.count)))
  ctx.on(pcHello, device => {
    if (device === hereOf(ctx)) load()
  })
  ctx.effect(() => effect(load))

  return count
}
