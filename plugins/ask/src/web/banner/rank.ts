import type { AskQuestion } from '@sand/protocol'
import { derive, div, icon, iconButton, list, sig, span, type Sig } from '@sand/dom'
import type { AskActions } from '../answering'
import type { AskState } from '../state'

export const rankView = (state: AskState, actions: AskActions, question: AskQuestion) => {
  const order = derive(() => state.draft.get().picked)
  const dragged = sig<number | undefined>(undefined)
  const over = sig<number | undefined>(undefined)

  const drop = (target: number) => {
    const from = dragged.get()
    dragged.set(undefined)
    over.set(undefined)
    if (from !== undefined && from !== target) actions.move(from, target)
  }

  const row = (item: Sig<number>, position: Sig<number>) => {
    const option = () => question.options[item.get()]!
    return div(
      {
        draggable: true,
        class: [
          'flex min-h-10 items-center gap-3 rounded-xl bg-neutral-900 py-1 pr-1 pl-3 text-sm text-neutral-200 ring-1 ring-neutral-700 select-none',
          () => (over.get() === position.get() ? 'ask-row-over' : ''),
          () => (dragged.get() === position.get() ? 'opacity-50' : ''),
        ],
        onDragStart: event => {
          dragged.set(position.get())
          event.dataTransfer?.setData('text/plain', option().label)
        },
        onDragOver: event => {
          if (dragged.get() === undefined) return
          event.preventDefault()
          over.set(position.get())
        },
        onDragLeave: () => over.set(undefined),
        onDrop: event => {
          event.preventDefault()
          drop(position.get())
        },
        onDragEnd: () => {
          dragged.set(undefined)
          over.set(undefined)
        },
      },
      span({ class: 'w-4 shrink-0 font-mono text-xs text-accent-400' }, () => String(position.get() + 1)),
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('grip', 14)),
      span({ class: 'min-w-0 flex-1 truncate' }, () => option().label),
      span({ class: 'hidden min-w-0 truncate text-xs text-neutral-500 sm:inline' }, () => option().description ?? ''),
      iconButton(
        { size: 'sm', title: 'Move up', disabled: () => position.get() === 0, onClick: () => actions.move(position.get(), position.get() - 1) },
        icon('up', 13),
      ),
    )
  }

  return list(order, index => index, row, div({ class: ['flex flex-col gap-2', () => (state.draft.get().text.trim() ? 'opacity-50' : '')] }))
}
