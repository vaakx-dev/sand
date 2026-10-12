import { errorMessage } from '@sand/kit'
import { span } from '@vaakx-dev/vrui'
import { machineGlyph } from '../rows'
import { refOf, type PickerContext } from '../target'
import type { SendBack } from './target'

const send = (ctx: PickerContext, { from, to }: SendBack) => {
  if (ctx.syncFlows) return ctx.syncFlows.send(refOf(from), refOf(to))
  void ctx.sync?.send(refOf(from), refOf(to)).catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))
}

export const sendBackView = (ctx: PickerContext, found: SendBack) => {
  const { icon, primaryAction, statusBanner } = ctx.kit
  const here = ctx.machines.get(found.from.device)
  const there = ctx.machines.get(found.to.device)
  return statusBanner(
    {},
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(machineGlyph(here), 14)),
    span({ class: 'min-w-0 flex-1 truncate' }, `Done on ${here?.name ?? 'this PC'}`),
    primaryAction({ size: 'sm', onClick: () => send(ctx, found) }, `Send to ${there?.name ?? 'the other PC'}`),
  )
}
