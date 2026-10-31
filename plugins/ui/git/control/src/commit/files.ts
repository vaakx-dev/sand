import type { FileKind, GitFile } from '@sand/git/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, list, span, type Derive } from '@vaakx-dev/vrui'
import { diffStat } from '../view/stat'
import { type CommitDraft, toggleFile } from './drafts'

const kinds: Record<FileKind, { letter: string; tone: string; title: string }> = {
  added: { letter: 'A', tone: 'text-success-400', title: 'Added' },
  untracked: { letter: 'A', tone: 'text-success-400', title: 'New file' },
  modified: { letter: 'M', tone: 'text-warning-400', title: 'Modified' },
  deleted: { letter: 'D', tone: 'text-danger-400', title: 'Deleted' },
  renamed: { letter: 'R', tone: 'text-accent-400', title: 'Renamed' },
  conflicted: { letter: '!', tone: 'text-danger-400', title: 'Conflict' },
}

export interface FileListProps {
  files: Derive<GitFile[]>
  draft: CommitDraft
  disabled(): boolean
  all(): boolean
}

export const fileList = (kit: Kit, { files, draft, disabled, all }: FileListProps) =>
  list(
    files,
    file => file.path,
    item => {
      const kind = () => kinds[item.get().kind]
      const path = () => item.get().path
      return kit.checkRow({
        checked: () => all() || !draft.excluded.get().has(path()),
        onToggle: () => toggleFile(draft, path()),
        disabled: () => disabled() || all(),
        surface: 'raised',
        title: span(
          { class: 'flex min-w-0 items-center gap-2' },
          span({ class: ['w-3 shrink-0 text-center font-mono text-xs', () => kind().tone], title: () => kind().title }, () => kind().letter),
          span({ class: 'min-w-0 truncate font-mono text-xs', title: path }, path),
        ),
        trail: diffStat(
          () => item.get().add,
          () => item.get().del,
        ),
      })
    },
    div({ class: 'flex max-h-80 flex-col overflow-auto rounded-md p-1 ring-1 ring-neutral-700' }),
  )
