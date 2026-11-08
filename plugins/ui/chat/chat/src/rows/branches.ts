import type { IconName } from '@sand/ui-kit/contract'
import { div, effect, show } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import type { ThreadView } from '../view'

export const branchSwitch = (ctx: ChatContext, view: ThreadView, entry: string) => {
  const { icon, iconButton } = ctx.kit
  const { branches } = view
  effect(() => branches.want(entry))
  const all = () => branches.of(entry)
  const index = () => all().findIndex(branch => branch.entry === entry)
  const at = (step: number) => all()[index() + step]

  const arrow = (step: number, glyph: IconName, title: string) =>
    iconButton(
      {
        size: 'sm',
        class: 'touch:h-8 touch:w-8',
        title,
        'aria-label': title,
        disabled: () => branches.running.get() || !at(step),
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
        { class: '-mr-1 flex items-center tabular-nums' },
        arrow(-1, 'left', 'Previous version'),
        ctx.kit.metaLine(() => `${index() + 1}/${all().length}`),
        arrow(1, 'right', 'Next version'),
      ),
  )
}
