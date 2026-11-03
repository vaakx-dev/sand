import type { Kit } from '@sand/ui-kit/contract'
import { bytes, folderName, plural } from '@sand/util'
import type { WorktreeStatus } from '@sand/worktrees/contract'
import { derive, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { type Cleanup, nameOf, unsaved } from './model'

const progress = (status: WorktreeStatus) => {
  if (status.pull?.state === 'merged') return `Merged #${status.pull.number}`
  if (status.ahead === 0) return 'No new commits'
  const commits = status.ahead === undefined ? '' : plural(status.ahead, 'commit')
  return [commits, status.pull ? `PR #${status.pull.number} ${status.pull.state}` : ''].filter(Boolean).join(' · ')
}

const meta = (kit: Kit, status: WorktreeStatus) => {
  const lost = unsaved(status.check)
  const state = status.check.running ? 'A thread is working in it' : progress(status)
  return span(
    [folderName(status.main), state].filter(Boolean).join(' · '),
    lost ? span({ class: kit.toneText.warning }, ` · Unsaved: ${lost}`) : null,
  )
}

const worktreeRow = (kit: Kit, cleanup: Cleanup, row: Sig<WorktreeStatus>) =>
  kit.checkRow({
    surface: 'raised',
    checked: () => cleanup.chosen.get().has(row.get().path),
    onToggle: () => void cleanup.toggle(row.get()),
    disabled: () => row.get().check.running || cleanup.removing.get(),
    title: () => nameOf(row.get()),
    meta: dynamicChild(row, status => meta(kit, status)),
    trail: () => {
      const size = cleanup.sizeOf(row.get())
      return size === undefined ? '…' : bytes(size)
    },
  })

const shownOf = (cleanup: Cleanup) => {
  if (cleanup.failed.get()) return 'failed'
  const found = cleanup.statuses.get()
  if (!found) return 'loading'
  return found.length ? 'list' : 'empty'
}

const list = (kit: Kit, cleanup: Cleanup) =>
  dynamicChild(derive(() => shownOf(cleanup)), state => {
    if (state === 'failed') return kit.errorText(cleanup.failed)
    if (state === 'empty') return kit.emptyState({ flush: true, text: 'Sand has no worktrees on this PC.' })
    if (state === 'loading') return kit.loadingState({ flush: true, text: 'Looking at your worktrees…' })
    return kit.rowList(cleanup.rows, status => status.path, row => worktreeRow(kit, cleanup, row))
  })

const removeLabel = (cleanup: Cleanup) => {
  if (cleanup.removing.get()) return 'Removing…'
  const count = cleanup.picked.get().length
  if (!count) return 'Choose worktrees'
  const freed = cleanup.freed.get()
  return `Remove ${plural(count, 'worktree')}${freed ? ` · ${bytes(freed)}` : ''}`
}

export const cleanupSheet = (kit: Kit, cleanup: Cleanup, close: () => void, remove: () => void) =>
  kit.overlay(
    close,
    kit.sheet(
      { 'aria-label': 'Clean up worktrees', size: 'md' },
      kit.sheetHead({ title: 'Clean up worktrees', close }),
      kit.sheetBody({}, list(kit, cleanup)),
      kit.sheetFoot(
        kit.quietButton({ surface: 'raised', onClick: close }, 'Cancel'),
        kit.primaryAction({ disabled: () => !cleanup.picked.get().length || cleanup.removing.get(), onClick: remove }, () => removeLabel(cleanup)),
      ),
    ),
  )
