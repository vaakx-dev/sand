import type { Entry } from '@sand/chats/contract'
import type { Monogram, Status } from '@sand/ui-shell/contract'
import { service } from 'drydock'

/** The shell route that shows one thread full width: `{ kind: threadRoute, id: thread }`. */
export const threadRoute = 'thread'

/** The shell route of a new thread before its first send: `{ kind: draftRoute, id: draft }`, with the draft's id from `threads.drafting()`. */
export const draftRoute = 'draft'

/** The link scheme for threads: `[title](thread:<id>)` in any markdown links to a thread. */
export const threadScheme = 'thread'

/**
 * A thread's state as rows, tabs and references show it. `status` joins the turn, its wait and its changes:
 * running while a turn runs; waiting on a question, approval or secret, a stop, or a merge that failed;
 * ready, merging and merged from its changes; done otherwise.
 */
export interface ThreadLive {
  id: string
  title: string
  status: Status
  /** One line: the wait's title or why the merge failed, "Working" while running, the diffstat when ready, else the first line of the last reply. */
  note: string
  /** When `status` began, in epoch ms: the turn's start while running, else the last activity. */
  at: number
}

/** Shows threads. Provided by the chat; reads are reactive. */
export interface ThreadView {
  /**
   * The thread's transcript and a composer, without a header, for the thread route and other surfaces such as a bot's tab.
   * Each call is an independent transcript that keeps its thread live while mounted. The composers share one draft and
   * target the selected thread, so while the returned element is on screen it selects its thread; when several are on screen,
   * the latest to appear wins, and when it leaves another one on screen takes over.
   * Call it inside a scope you own and dispose that scope to remove it.
   */
  render(thread: string): HTMLElement
  live(thread: string): ThreadLive | undefined
  /** Opens the thread where it belongs: through its owner when one claims it, else on the thread route. */
  open(thread: string): void
}

export const threadView = service<ThreadView>('threadView')

/** Something that owns threads, such as a bot. `id` is what a `{ kind: 'owner' }` chip scope names. */
export interface ThreadOwner extends Monogram {
  id: string
  label: string
  /** Opens one of its threads in its own view, such as a tab in the bot's screen. */
  open(thread: string): void
}

/**
 * Who owns which thread. Provided by the bots bridge, so it is absent with bots off; reads are reactive.
 * Recent chats leave out owned threads, breadcrumbs read "owner / title", and owned threads open through their owner.
 */
export interface ThreadOwners {
  owner(thread: string): ThreadOwner | undefined
  /** Who sent a user message in the thread when the user didn't, for the "From …" line over it. */
  sender(thread: string, entry: Entry): ThreadOwner | undefined
}

export const threadOwners = service<ThreadOwners>('threadOwners')
