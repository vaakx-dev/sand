import { contextMenu, copyWithNotice, derive, div, errorMessage, icon, iconButton, show, span, type Derive, type MenuSpec, type NavAction } from '@sand/dom'
import { plural } from '@sand/kit'
import type { Context } from 'drydock'
import type { GoalView } from './slot'

const checks = (count: number) => (count ? plural(count, 'check') : '')

const clear = (ctx: Context) => void ctx.commands?.run('goal', 'clear').catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))

const bannerMenu = (ctx: Context, objective: string): MenuSpec => ({
  title: 'Goal',
  subtitle: objective,
  actions: [
    { id: 'copy', label: 'Copy objective', icon: 'copy', group: 'copy', run: () => copyWithNotice(ctx.notify, objective, 'goal') },
    ...(ctx.commands ? [{ id: 'clear', label: 'Clear goal', icon: 'x', group: 'goal', danger: true, run: () => clear(ctx) } satisfies NavAction] : []),
  ],
})

export const goalBanner = (ctx: Context, view: Derive<GoalView | null>, hasCommands: Derive<boolean>) => {
  const goal = () => view.get()?.goal
  const reason = derive(() => goal()?.reason ?? '')
  const menu = contextMenu()
  return div(
    {
      role: 'status',
      class: 'flex min-h-10 w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-1 text-sm text-neutral-300 animate-fade',
      ...menu.target(() => {
        const objective = goal()?.objective
        return objective ? bannerMenu(ctx, objective) : undefined
      }),
    },
    span({ class: 'inline-flex shrink-0 text-accent-400' }, icon('goal', 15)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      div(
        { class: 'flex min-w-0 items-center gap-2' },
        span({ class: 'shrink-0 font-medium text-neutral-200' }, () => (view.get()?.running ? 'Pursuing goal' : 'Goal')),
        span({ class: 'min-w-0 truncate', title: () => goal()?.objective ?? '' }, () => goal()?.objective ?? ''),
        span({ class: 'shrink-0 text-xs text-neutral-500' }, () => checks(goal()?.checks ?? 0)),
      ),
      show(
        () => Boolean(reason.get()),
        () => span({ class: 'truncate text-xs text-neutral-500', title: reason }, () => `Last check: ${reason.get()}`),
      ),
    ),
    show(hasCommands, () => iconButton({ size: 'sm', title: 'Clear goal', onClick: () => clear(ctx) }, icon('x', 13))),
    menu.view(),
  )
}
