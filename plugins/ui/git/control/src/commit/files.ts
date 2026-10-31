import type { GitFile } from '@sand/git/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, list, span, type Derive } from '@vaakx-dev/vrui'
import { type CommitDraft, toggleFile } from './drafts'

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
      const path = () => item.get().path
      return kit.checkRow({
        checked: () => all() || !draft.excluded.get().has(path()),
        onToggle: () => toggleFile(draft, path()),
        disabled: () => disabled() || all(),
        surface: 'raised',
        title: span(
          { class: 'flex min-w-0 items-center gap-2' },
          kit.fileKindMark(() => item.get().kind),
          span({ class: 'min-w-0 truncate font-mono text-xs', title: path }, path),
        ),
        trail: kit.lineStat(
          () => item.get().add,
          () => item.get().del,
        ),
      })
    },
    div({ class: 'flex max-h-80 flex-col overflow-auto rounded-md p-1 ring-1 ring-neutral-700' }),
  )
