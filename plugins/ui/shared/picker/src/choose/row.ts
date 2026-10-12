import type { PickItem, PickTone } from '@sand/server/contract'
import { optionProps } from '@sand/kit/web'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { PickModel } from './model'

const tones: Record<PickTone, string> = {
  accent: 'text-accent-400',
  warning: 'text-warning-400',
  error: 'text-danger-400',
}

export const row = <T>({ rowAction }: Kit, item: PickItem<T>, position: Sig<number>, { box, tree, rowActions, act }: PickModel<T>, fine: Sig<boolean>, menu: ContextMenu) => {
  const actions = rowActions.map(action => ({ id: action.id, label: action.label, danger: action.danger, run: () => act(action.id, position.get()) }))
  const pressed = actions.length ? menu.target(() => ({ title: item.label, subtitle: item.detail, actions }), optionProps(box, position).onClick) : {}
  return div(
    {
      ...optionProps(box, position),
      ...pressed,
      class: [
        'flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-sm cursor-pointer',
        () => (box.isSelected(position.get()) ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'),
      ],
    },
    item.prefix && span({ class: 'shrink-0 whitespace-pre font-mono text-xs text-neutral-500', hidden: tree.map(open => !open) }, item.prefix),
    span({ class: ['min-w-0 flex-1 truncate', item.tone && tones[item.tone]], title: item.label }, item.label),
    item.detail && span({ class: 'max-w-48 shrink-0 truncate text-xs text-neutral-500 tabular-nums', title: item.detail }, item.detail),
    actions.length > 0 &&
      show(
        () => !fine.get() || box.isSelected(position.get()),
        () => div({ class: 'flex shrink-0 items-center gap-1' }, actions.map(rowAction)),
      ),
  )
}
