import type { IconName } from '@sand/ui-kit/contract'
import { div, effect, resource, show, span } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import type { ThreadView } from '../view'

export const branchSwitch = (ctx: ChatContext, view: ThreadView, entry: string) => {
  const { icon, iconButton } = ctx.kit
  const branches = resource(() => ctx.threads.branches(view.id, entry), { lazy: true })
  effect(() => {
    if (view.synced.get()) branches.refetch()
  })
  const all = () => branches.data.get() ?? []
  const index = () => all().findIndex(branch => branch.entry === entry)
  const at = (step: number) => all()[index() + step]

  const arrow = (step: number, glyph: IconName, title: string) =>
    iconButton(
      {
        size: 'sm',
        class: 'touch:h-10 touch:w-10',
        title,
        'aria-label': title,
        disabled: () => view.running.get() || !at(step),
        onClick: () => {
          const branch = at(step)
          if (branch) void ctx.threads.checkout(view.id, branch.leaf)
        },
      },
      icon(glyph, 'sm'),
    )

  return show(
    () => all().length > 1,
    () =>
      div(
        { class: 'flex items-center text-xs text-neutral-400 tabular-nums' },
        arrow(-1, 'left', 'Previous version'),
        span(() => `${index() + 1}/${all().length}`),
        arrow(1, 'right', 'Next version'),
      ),
  )
}
