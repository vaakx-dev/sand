import type { Composer } from '@sand/composer-card/contract'
import { derive, effect, untrack, type Pulse } from '@sand/dom'
import type { WebContext } from '../client'
import { progressBanner } from './banner'
import type { Progress } from './store'

export const mountProgress = (ctx: WebContext, composer: Composer, progress: Progress, changes: Pulse) => {
  const current = changes.read(() => ctx.threads.current()?.id)
  const shown = derive(() => {
    const id = current.get()
    return id && progress.of(id) ? id : undefined
  })
  return effect(() => {
    const id = shown.get()
    if (!id) return
    const remove = untrack(() => composer.slot('above', () => progressBanner(() => progress.of(id), () => progress.dismiss(id)), -8))
    return () => void remove()
  })
}
