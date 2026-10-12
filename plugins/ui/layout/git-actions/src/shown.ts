import { onPageReturn } from '@sand/kit/web'
import { onInterval } from '@vaakx-dev/vrui'
import { onFeatureBranch, type GitContext, type Model } from './model'

const everyMs = 60_000

export const refreshWhileShown = (ctx: GitContext, model: Model) => {
  ctx.effect(() =>
    onPageReturn(() => {
      const git = model.status.get()
      if (git && onFeatureBranch(git)) model.refreshPr()
    }),
  )
  ctx.effect(() =>
    onInterval(() => {
      if (document.visibilityState !== 'visible' || !model.status.get()) return
      const { cwd, device } = model.target()
      ctx.gitStatus.refresh(cwd, device)
    }, everyMs),
  )
}
