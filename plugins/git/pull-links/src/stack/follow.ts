import type { Sessions } from '@sand/chats/contract'
import type { LinkBook } from '../book/book'
import type { ThreadPulls } from '../contract'
import type { ThreadLinks } from '../links/links'
import { isLive } from '../links/thread'
import { stackSiblings } from './siblings'

export interface StackDeps {
  sessions: Sessions
  book: LinkBook
  links: ThreadLinks
}

export const followStacks =
  ({ sessions, book, links }: StackDeps) =>
  ({ session, links: shown }: ThreadPulls) => {
    const thread = sessions.open(session)
    if (!thread || !isLive(thread)) return
    const siblings = stackSiblings(shown, book.read(thread.id))
    if (siblings.length) links.linkStack(thread, siblings)
  }
