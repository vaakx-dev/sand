import type { Session, Sessions } from '@sand/chats/contract'
import type { PullSummary } from '@sand/github/contract'
import type { Orchestrator } from '@sand/orchestrator/contract'
import type { LinkBook } from '../book/book'
import { findLink } from '../links/edit'
import type { ThreadLinks } from '../links/links'
import { noticeOf, type Told } from './notice'
import { phaseOf } from './phase'

export interface StarterDeps {
  sessions: Sessions
  book: LinkBook
  links: ThreadLinks
  orchestrator(): Orchestrator | undefined
  report(error: unknown): void
}

const tell = async (deps: StarterDeps, threads: Orchestrator, thread: Session, summary: PullSummary, phase: Told) => {
  if (await threads.notify(thread.id, noticeOf(thread.id, summary, phase))) deps.links.tell(thread, summary, phase)
}

export const tellStarters = (deps: StarterDeps, summary: PullSummary) => {
  const threads = deps.orchestrator()
  if (!threads) return
  const phase = phaseOf(summary)
  for (const id of deps.links.linking(summary)) {
    const thread = deps.sessions.open(id)
    const told = findLink(deps.book.read(id), summary)?.told ?? 'open'
    if (!thread || told === phase || !threads.starterOf(id)) continue
    if (phase === 'open') deps.links.tell(thread, summary, phase)
    else tell(deps, threads, thread, summary, phase).catch(deps.report)
  }
}
