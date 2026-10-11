import type { Browser, BrowserTab } from '@sand/browser-engine/contract'
import type { Session, SessionInfo, Sessions } from '@sand/sessions-sqlite/contract'
import { keyedSerial } from '@sand/kit'

type Work<T> = (tab: BrowserTab) => T | Promise<T>

export interface Tabs {
  open<T>(session: Session, work: Work<T>): Promise<T>
  current<T>(session: Session, work: Work<T>): Promise<T>
}

const threadOf = (sessions: Sessions, session: Session) => {
  let current: SessionInfo = session
  while (current.kind === 'agent' && current.parent) {
    const parent = sessions.open(current.parent)
    if (!parent) break
    current = parent
  }
  return current.id
}

export const createTabs = (browser: Browser, sessions: Sessions): Tabs => {
  const queue = keyedSerial()

  const existing = (thread: string) => {
    const tab = browser.find(thread)
    if (!tab) throw new Error('No page is open. Call browser_open first.')
    return tab
  }

  return {
    open(session, work) {
      const thread = threadOf(sessions, session)
      return queue(thread, async () => work(await browser.tab(thread)))
    },
    current(session, work) {
      const thread = threadOf(sessions, session)
      return queue(thread, async () => work(existing(thread)))
    },
  }
}
