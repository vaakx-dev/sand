import { div, errorMessage, primaryAction, span } from '@sand/dom'
import { machineIcon } from '../rows'
import { refOf, type PickerContext } from '../target'
import type { SendBack } from './target'

const send = (ctx: PickerContext, { from, to }: SendBack) => {
  if (ctx.syncFlows) return ctx.syncFlows.send(refOf(from), refOf(to))
  void ctx.sync?.send(refOf(from), refOf(to)).catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))
}

export const sendBackView = (ctx: PickerContext, found: SendBack) => {
  const here = ctx.machines.get(found.from.device)
  const there = ctx.machines.get(found.to.device)
  return div(
    { role: 'status', class: 'flex min-h-10 w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-1 text-sm text-neutral-300 animate-fade' },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, machineIcon(here)),
    span({ class: 'min-w-0 flex-1 truncate' }, `Done on ${here?.name ?? 'this PC'}`),
    primaryAction({ size: 'sm', onClick: () => send(ctx, found) }, `Send to ${there?.name ?? 'the other PC'}`),
  )
}
