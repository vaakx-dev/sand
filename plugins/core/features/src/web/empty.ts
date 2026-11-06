import { layout, spaces } from '@sand/layout/contract'
import { owned, pulse } from '@sand/reactive'
import { settings, settingsChange } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { effect, sig, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const emptyView = ({ primaryAction, setupFrame, setupHeading, setupNote, setupScreen }: Kit, open: () => void) =>
  setupFrame(
    setupScreen(
      setupHeading('Nothing here yet'),
      setupNote('Turn on a feature like Threads, Bots or Calendar to use sand here.'),
      primaryAction({ onClick: open }, 'Choose features'),
    ),
  )

export const emptyMain = (ctx: Context, kit: Kit) => {
  const settled = sig(false)
  void ctx.settled().then(() => settled.set(true))
  const shell = pulse(ctx, [settingsChange], [layout, spaces, settings])
  const bare = shell.read(() => {
    if (!settled.get() || ctx.get(spaces)?.list().length !== 0 || ctx.get(settings)?.current()) return undefined
    return ctx.get(layout)
  })
  const open = () => ctx.get(settings)?.open('features')
  owned(ctx, () =>
    effect(() => {
      const found = bare.get()
      if (!found) return
      const uncover = untrack(() => found.cover('main', emptyView(kit, open)))
      return () => void uncover()
    }),
  )
}
