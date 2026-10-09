import type { PickItem, PickTone } from '@sand/protocol'
import { derive, div, listboxRow, rowAction, show, span, type Sig } from '@sand/dom'
import type { PickModel } from './model'

const tones: Record<PickTone, string> = {
  accent: 'text-accent-400',
  warning: 'text-warning-400',
  error: 'text-danger-400',
}

export const row = <T>(item: PickItem<T>, position: Sig<number>, { box, tree, rowActions, act }: PickModel<T>, fine: Sig<boolean>) =>
  listboxRow(
    box,
    position,
    {},
    item.prefix && span({ class: 'shrink-0 whitespace-pre font-mono text-xs text-neutral-500', hidden: tree.map(open => !open) }, item.prefix),
    span({ class: ['min-w-0 flex-1 truncate', item.tone && tones[item.tone]], title: item.label }, item.label),
    item.detail && span({ class: 'max-w-48 shrink-0 truncate text-xs text-neutral-500 tabular-nums', title: item.detail }, item.detail),
    rowActions.length > 0 &&
      show(
        derive(() => !fine.get() || box.isSelected(position.get())),
        () => div({ class: 'flex shrink-0 items-center gap-1' }, rowActions.map(action => rowAction({ label: action.label, danger: action.danger, run: () => act(action.id, position.get()) }))),
      ),
  )
