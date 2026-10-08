import type { Commands } from '@sand/protocol'
import { derive, div, errorMessage, icon, iconButton, show, span } from '@sand/dom'
import type { Context } from 'drydock'
import type { GoalView } from './slot'

const checks = (count = 0) => (count ? `${count} ${count === 1 ? 'check' : 'checks'}` : '')

const clear = (ctx: Context, commands: Commands) =>
  void commands.run('goal', 'clear').catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))

export const goalBanner = (ctx: Context, view: { get(): GoalView | null }) => {
  const goal = () => view.get()?.goal
  const reason = derive(() => goal()?.reason ?? '')
  return div(
    { role: 'status', class: 'flex min-h-10 w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-1 text-sm text-neutral-300 animate-fade' },
    span({ class: 'inline-flex shrink-0 text-accent-400' }, icon('goal', 15)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      div(
        { class: 'flex min-w-0 items-center gap-2' },
        span({ class: 'shrink-0 font-medium text-neutral-200' }, () => (view.get()?.running ? 'Pursuing goal' : 'Goal')),
        span({ class: 'min-w-0 truncate', title: () => goal()?.objective ?? '' }, () => goal()?.objective ?? ''),
        span({ class: 'shrink-0 text-xs text-neutral-500' }, () => checks(goal()?.checks)),
      ),
      show(derive(() => Boolean(reason.get())), () => span({ class: 'truncate text-xs text-neutral-500', title: () => reason.get() }, () => `Last check: ${reason.get()}`)),
    ),
    ctx.commands ? iconButton({ size: 'sm', title: 'Clear goal', onClick: () => ctx.commands && clear(ctx, ctx.commands) }, icon('x', 13)) : '',
  )
}
