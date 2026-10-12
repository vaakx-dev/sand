import { ago, oneLine } from '@sand/kit'
import type { Pc } from '@sand/pc-link/contract'
import type { SessionSummary } from '@sand/sessions-sqlite/contract'

interface Listed {
  pc: Pc
  thread: SessionSummary
  project?: string
}

const flags = (thread: SessionSummary) =>
  [thread.pinned && 'pinned', thread.settled && 'archived', thread.kind === 'branch' && 'fork', thread.creator && 'started by an agent'].filter(Boolean)

const updated = (at: number) => {
  const since = ago(at)
  return since === 'now' ? 'updated just now' : `updated ${since} ago`
}

export const threadLine = ({ pc, thread, project }: Listed) =>
  [`- "${oneLine(thread.title ?? 'Untitled', 80)}"`, `id ${thread.id}`, pc.name, project ?? thread.cwd, ...flags(thread), updated(thread.updated)].join(' · ')
