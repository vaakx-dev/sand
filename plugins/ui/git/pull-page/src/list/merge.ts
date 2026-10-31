import { pullName, pullRef } from '@sand/github/look'
import type { InboxPull } from '@sand/pull-inbox/contract'
import { sig, stopThen } from '@vaakx-dev/vrui'
import { confirmStep } from '../confirm/step'
import { hereOf, toastId } from '../inject'
import type { PageParts } from '../parts'
import { chosenMethod, methodLabels } from '../pull/method'

export const inlineMerge = (parts: PageParts, pull: () => InboxPull) => {
  const { kit, ctx } = parts
  const busy = sig(false)
  const confirm = confirmStep()
  const method = () => chosenMethod(pull().repo, pull().methods)

  const merge = async () => {
    const shown = pull()
    const name = pullName(shown)
    busy.set(true)
    const done = await ctx.toasts.attempt(toastId, `Couldn't merge ${name}`, () => ctx.github.merge({ ...pullRef(shown), method: method() }, hereOf(ctx)))
    busy.set(false)
    if (done) ctx.toasts.show({ id: toastId, tone: 'success', title: `Merged ${name}` })
  }

  return kit.secondaryAction(
    {
      size: 'sm',
      class: confirm.ring,
      disabled: busy,
      title: () => `${methodLabels[method()]} into ${pull().base}`,
      onClick: stopThen(() => confirm.press(() => void merge())),
    },
    () => (busy.get() ? 'Merging…' : confirm.armed.get() ? 'Confirm merge?' : methodLabels[method()]),
  )
}
