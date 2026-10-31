import type { FileKind } from '@sand/git/contract'
import { show, span } from '@vaakx-dev/vrui'

const letters: Record<FileKind, { letter: string; tone: string; title: string }> = {
  added: { letter: 'A', tone: 'text-success-400', title: 'Added' },
  untracked: { letter: 'A', tone: 'text-success-400', title: 'New file' },
  modified: { letter: 'M', tone: 'text-warning-400', title: 'Modified' },
  deleted: { letter: 'D', tone: 'text-danger-400', title: 'Deleted' },
  renamed: { letter: 'R', tone: 'text-accent-400', title: 'Renamed' },
  conflicted: { letter: '!', tone: 'text-danger-400', title: 'Conflict' },
}

export const kindMark = (kind: () => FileKind) =>
  span(
    { class: ['w-3 shrink-0 text-center font-mono text-xs font-medium', () => letters[kind()].tone], title: () => letters[kind()].title },
    () => letters[kind()].letter,
  )

const splitPath = (path: string) => {
  const cut = path.lastIndexOf('/') + 1
  return { folder: path.slice(0, cut), name: path.slice(cut) }
}

export const pathLabel = (path: () => string) =>
  span(
    { class: 'flex min-w-0', title: path },
    span({ class: 'min-w-0 truncate text-neutral-500' }, () => splitPath(path()).folder),
    span({ class: 'shrink-0 text-neutral-100' }, () => splitPath(path()).name),
  )

export const lineStat = (add: () => number, del: () => number) =>
  span(
    { class: 'flex shrink-0 gap-1.5 font-mono text-xs tabular-nums' },
    show(
      () => add() > 0 || del() === 0,
      () => span({ class: 'text-success-400' }, () => `+${add()}`),
    ),
    show(
      () => del() > 0,
      () => span({ class: 'text-danger-400' }, () => `−${del()}`),
    ),
  )
