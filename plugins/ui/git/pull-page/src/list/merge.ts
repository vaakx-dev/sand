import type { InboxPull } from '@sand/pull-inbox/contract'
import { sig, stopThen } from '@vaakx-dev/vrui'
import { confirmStep } from '../confirm/step'
import { hereOf } from '../inject'
import { attempt, notify } from '../notify'
import type { PageParts } from '../parts'
import { pullName } from '../pull/look'
import { chosenMethod, methodLabels } from '../pull/method'
import { refOf } from '../pull/ref'

export const inlineMerge = (parts: PageParts, pull: () => InboxPull) => {
  const { kit, ctx } = parts
  const busy = sig(false)
  const confirm = confirmStep()
  const method = () => chosenMethod(pull().repo, pull().methods)

  const merge = async () => {
    const shown = pull()
    const name = pullName(shown.number)
    busy.set(true)
    const done = await attempt(ctx, `Couldn't merge ${name}`, () => ctx.github.merge({ ...refOf(shown), method: method() }, hereOf(ctx)))
    busy.set(false)
    if (done) notify(ctx, { tone: 'success', title: `Merged ${name}` })
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
