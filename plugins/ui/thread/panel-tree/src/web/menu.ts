import type { MenuSpec, NavAction } from '@sand/dom'
import type { RowActions, TreeItem } from './row'

const labelText = (text: string) => text.replace(/\s+/g, ' ').trim()

const goActions = ({ row, head }: TreeItem, actions: RowActions): NavAction[] => [
  ...(head ? [] : [{ id: 'go', group: 'go', label: 'Go here', icon: 'pin', quick: true, run: () => actions.jump(row.id) }]),
  { id: 'fork', group: 'go', label: 'Fork from here', icon: 'fork', quick: true, run: () => actions.fork(row.id) },
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
      preview: text => (labelText(text) ? `Label this point “${labelText(text)}”` : undefined),
      run: text => actions.setLabel(row.id, text),
    },
    run: () => {},
  },
  ...(tree.label ? [{ id: 'unlabel', group: 'label', label: 'Remove label', icon: 'x', run: () => actions.setLabel(row.id, '') }] : []),
]

const foldActions = ({ row }: TreeItem, actions: RowActions): NavAction[] =>
  row.fold ? [{ id: 'fold', group: 'branch', label: row.fold === 'closed' ? 'Expand branch' : 'Collapse branch', icon: row.fold === 'closed' ? 'down' : 'up', run: () => actions.fold(row.id) }] : []

export const rowMenu = (item: TreeItem, actions: RowActions): MenuSpec => ({
  title: item.tree.label?.text ?? item.tree.described.who,
  subtitle: item.tree.described.text || undefined,
  actions: [...goActions(item, actions), ...labelActions(item, actions), ...foldActions(item, actions)],
})
