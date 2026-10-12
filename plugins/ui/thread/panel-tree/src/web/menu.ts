import { oneLine } from '@sand/kit'
import type { MenuSpec, NavAction } from '@sand/protocol'
import type { RowActions, TreeItem } from './row'

const goActions = ({ row, head }: TreeItem, actions: RowActions): NavAction[] => [
  ...(head ? [] : [{ id: 'go', group: 'go', label: 'Go here', icon: 'pin', quick: true, run: () => actions.jump(row.id) } satisfies NavAction]),
  { id: 'fork', group: 'go', label: 'Fork', icon: 'fork', quick: true, run: () => actions.fork(row.id) },
]

const labelActions = ({ row, tree }: TreeItem, actions: RowActions): NavAction[] => [
  {
    id: 'label',
    group: 'label',
    label: tree.label ? 'Change label' : 'Add label',
    icon: 'tag',
    quick: true,
    ask: {
      placeholder: 'Label',
      tip: 'Label',
      submit: 'Save',
      preview: text => (oneLine(text) ? `Label this point “${oneLine(text)}”` : undefined),
      run: text => actions.setLabel(row.id, text),
    },
    run: () => {},
  },
  ...(tree.label ? [{ id: 'unlabel', group: 'label', label: 'Remove label', icon: 'x', run: () => actions.setLabel(row.id, '') } satisfies NavAction] : []),
]

const foldActions = ({ row }: TreeItem, actions: RowActions): NavAction[] =>
  row.fold ? [{ id: 'fold', group: 'branch', label: row.fold === 'closed' ? 'Expand branch' : 'Collapse branch', icon: row.fold === 'closed' ? 'down' : 'up', run: () => actions.fold(row.id) }] : []

export const rowMenu = (item: TreeItem, actions: RowActions): MenuSpec => ({
  title: item.tree.label ?? item.tree.described.who,
  subtitle: item.tree.described.text || undefined,
  actions: [...goActions(item, actions), ...labelActions(item, actions), ...foldActions(item, actions)],
})
