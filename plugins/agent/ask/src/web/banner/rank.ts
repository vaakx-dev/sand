import type { AskQuestion } from '../../contract'
import { reorder } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, list, span, type Sig } from '@vaakx-dev/vrui'
import type { AskActions } from '../answering'
import type { AskState } from '../state'

export const rankView = (kit: Kit, state: AskState, actions: AskActions, question: AskQuestion) => {
  const { icon, iconButton } = kit
  const order = derive(() => state.draft.get().picked)
  const ids = () => order.get().map(String)

  const drag = reorder({
    axis: 'y',
    siblings: ids,
    move(_group, id, above) {
      const rest = ids().filter(other => other !== id)
      actions.move(ids().indexOf(id), above ? rest.indexOf(above) + 1 : 0)
    },
  })

  const row = (item: Sig<number>, position: Sig<number>) => {
    const option = () => question.options[item.get()]!
    return div(
      {
        class: 'flex min-h-10 items-center gap-3 rounded-xl bg-neutral-900 py-1 pr-1 pl-3 text-sm text-neutral-200 ring-1 ring-neutral-700 select-none',
        ...drag(() => ({ id: String(item.get()), group: 'rank', movable: true })),
      },
      span({ class: 'w-4 shrink-0 font-mono text-xs text-accent-400' }, () => String(position.get() + 1)),
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('grip', 14)),
      span({ class: 'min-w-0 flex-1 truncate' }, () => option().label),
      span({ class: 'hidden min-w-0 truncate text-xs text-neutral-400 sm:inline' }, () => option().description ?? ''),
      iconButton(
        { size: 'sm', title: 'Move up', disabled: () => position.get() === 0, onClick: () => actions.move(position.get(), position.get() - 1) },
        icon('up', 14),
      ),
    )
  }

  return list(order, index => index, row, div({ class: ['flex flex-col gap-2', () => (state.typed.get() ? 'opacity-50' : '')] }))
}
