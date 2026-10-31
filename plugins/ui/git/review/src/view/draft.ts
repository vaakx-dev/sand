import type { DiffRange } from '@sand/git-diff-view/contract'
import { keys, sig } from '@vaakx-dev/vrui'
import { askAgent } from '../agent/ask'
import type { CommentPlace } from '../model/pending'
import type { CodeTab } from '../model/state'
import { buttonRow, noteFrame } from './frame'

const placeOf = ({ path, start, end, side }: DiffRange): CommentPlace => ({
  path,
  line: end,
  side: side === 'new' ? 'RIGHT' : 'LEFT',
  ...(start < end ? { startLine: start } : {}),
})

export const draftBox = (tab: CodeTab, range: DiffRange) => {
  const { kit, draft, pending, selection } = tab
  const asking = sig(false)
  const text = () => draft.get().trim()
  const close = () => {
    draft.set('')
    selection.clear()
  }
  const add = async () => {
    if (text() && (await pending.comment(placeOf(range), text()))) close()
  }
  const ask = async () => {
    if (!text() || asking.get()) return
    asking.set(true)
    await askAgent(tab, range, text(), close)
    asking.set(false)
  }
  const idle = () => !text() || pending.busy.get()
  return noteFrame(
    kit.textArea({
      bindValue: draft,
      rows: 3,
      placeholder: 'Comment on these lines, or ask the agent about them',
      'aria-label': 'Comment',
      onKeyDown: keys({ 'mod+Enter': () => void add(), Escape: close }),
      onMount: element => element.focus(),
    }),
    buttonRow(
      kit.quietButton({ size: 'sm', onClick: close }, 'Cancel'),
      kit.secondaryAction({ size: 'sm', disabled: () => !text() || asking.get(), onClick: () => void ask() }, 'Ask agent'),
      kit.primaryAction({ size: 'sm', disabled: idle, onClick: () => void add() }, 'Add to review'),
    ),
  )
}
