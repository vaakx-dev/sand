import { read, span, type MaybeReactive } from '@vaakx-dev/vrui'
import type { Tone } from './marks'
import { toneText } from './tones'

export type FileChangeKind = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'

const looks: Record<FileChangeKind, { letter: string; tone: Tone; title: string }> = {
  added: { letter: 'A', tone: 'success', title: 'Added' },
  untracked: { letter: 'A', tone: 'success', title: 'New file' },
  modified: { letter: 'M', tone: 'warning', title: 'Modified' },
  deleted: { letter: 'D', tone: 'danger', title: 'Deleted' },
  renamed: { letter: 'R', tone: 'accent', title: 'Renamed' },
  conflicted: { letter: '!', tone: 'danger', title: 'Conflict' },
}

export const fileKindMark = (kind: MaybeReactive<FileChangeKind>) => {
  const look = () => looks[read(kind)]
  return span({ class: ['w-3 shrink-0 text-center font-mono text-xs font-medium', () => toneText[look().tone]], title: () => look().title }, () => look().letter)
}
