import type { PendingComment } from '@sand/pull-review/contract'
import { div, dynamicChild, keys, span } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { buttonRow, noteFrame } from './frame'

const editBox = (tab: CodeTab, comment: PendingComment) => {
  const { kit, pending, editing, edited } = tab
  const done = () => editing.set(undefined)
  const save = async () => {
    const text = edited.get().trim()
    if (!text) return
    if (text === comment.body.trim() || (await pending.edit(comment, text))) done()
  }
  return [
    kit.textArea({
      bindValue: edited,
      rows: 3,
      'aria-label': 'Edit comment',
      onKeyDown: keys({ 'mod+Enter': () => void save(), Escape: done }),
      onMount: element => element.focus(),
    }),
    buttonRow(
      kit.quietButton({ size: 'sm', onClick: done }, 'Cancel'),
      kit.primaryAction({ size: 'sm', disabled: () => !edited.get().trim() || pending.busy.get(), onClick: () => void save() }, 'Save'),
    ),
  ]
}

const commentShown = (tab: CodeTab, comment: PendingComment) => {
  const { kit, pending, editing, edited } = tab
  const edit = () => {
    edited.set(comment.body)
    editing.set(comment.id)
  }
  return [
    div(
      { class: 'flex items-center gap-2' },
      span({ class: 'text-xs text-neutral-500' }, 'Waiting in your review'),
      comment.byAgent ? kit.badge('accent', 'Agent') : null,
      span({ class: 'flex-1' }),
      kit.iconButton({ size: 'sm', title: 'Edit comment', 'aria-label': 'Edit comment', disabled: pending.busy, onClick: edit }, kit.icon('pencil', 14)),
      kit.iconButton(
        { size: 'sm', title: 'Remove comment', 'aria-label': 'Remove comment', disabled: pending.busy, onClick: () => void pending.remove(comment.id) },
        kit.icon('trash', 14),
      ),
    ),
    div({ class: 'whitespace-pre-wrap text-sm' }, comment.body),
  ]
}

export const commentCard = (tab: CodeTab, comment: PendingComment) =>
  noteFrame(
    dynamicChild(
      () => tab.editing.get() === comment.id,
      editing => div({ class: 'flex flex-col gap-2' }, ...(editing ? editBox(tab, comment) : commentShown(tab, comment))),
    ),
  )
