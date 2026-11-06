import type { Session, Sessions } from '@sand/chats/contract'
import type { GitHub, PullRef } from '@sand/github/contract'
import type { LinkSource, ThreadPulls } from '../contract'
import type { LinkBook } from '../book/book'
import { type Phase, refOf, type StoredLinks, type WatchMark } from '../book/record'
import { isEnded } from '../sweep/cadence'
import { findLink, withEnded, withEngaged, withLink, withMark, withoutLink, withoutWatching, withTold, withWatch } from './edit'
import { threadOf } from './thread'
import { threadPulls } from './view'

export interface LinkDeps {
  github: GitHub
  sessions: Sessions
  book: LinkBook
  announce(session: string): void
  watched(pull: PullRef): void
}

export const createThreadLinks = (deps: LinkDeps) => {
  const thread = (id: string) => threadOf(deps.sessions, id)
  const view = (found: Session): Promise<ThreadPulls> => threadPulls(deps.github, found.id, deps.book.read(found.id))

  const change = (found: Session, edit: (links: StoredLinks) => StoredLinks) => {
    const before = deps.book.read(found.id)
    const after = edit(before)
    if (after === before) return false
    deps.book.write(found, after)
    deps.announce(found.id)
    return true
  }

  const changeUnseen = (found: Session, edit: (links: StoredLinks) => StoredLinks) => {
    const before = deps.book.read(found.id)
    const after = edit(before)
    if (after !== before) deps.book.write(found, after)
  }

  const writes = new Map<string, number>()

  const withEnd = (id: string, pull: PullRef, ended: number | undefined) => (links: StoredLinks) => {
    const next = withEnded(links, pull, ended)
    const wrote = writes.get(id) ?? 0
    return ended !== undefined && wrote > ended ? withEngaged(next, wrote) : next
  }

  const linking = (pull: PullRef) => deps.book.threads().filter(id => findLink(deps.book.read(id), pull))

  const edited = (id: string, edit: (links: StoredLinks) => StoredLinks) => {
    const found = thread(id)
    change(found, edit)
    return view(found)
  }

  const linked = (found: Session, pull: PullRef) => {
    if (!findLink(deps.book.read(found.id), pull)) throw new Error(`#${pull.number} isn't linked to this thread.`)
  }

  return {
    thread,
    view: (id: string) => view(thread(id)),
    all: () =>
      Promise.all(
        deps.book.threads().flatMap(id => {
          const found = deps.sessions.open(id)
          return found ? [view(found)] : []
        }),
      ),
    linking,
    read: (id: string) => deps.book.read(thread(id).id),
    link: (id: string, pull: PullRef, source: LinkSource) => edited(id, links => withLink(links, pull, source, Date.now())),
    async linkText(id: string, text: string) {
      const found = thread(id)
      const pull = await deps.github.resolve(found.cwd, text)
      return edited(found.id, links => withLink(links, pull, 'linked', Date.now()))
    },
    unlink: (id: string, pull: PullRef) => edited(id, links => withoutLink(links, pull)),
    async watch(id: string, pull: PullRef, on: boolean) {
      const found = thread(id)
      linked(found, pull)
      if (on) {
        const summary = await deps.github.summary(refOf(pull))
        if (isEnded(summary)) throw new Error(`#${pull.number} is ${summary.state}, so there's nothing to watch.`)
      }
      const result = await edited(found.id, links => withWatch(links, pull, on))
      if (on) deps.watched(pull)
      return result
    },
    linkStack: (found: Session, pulls: PullRef[]) => change(found, links => pulls.reduce((next, pull) => withLink(next, pull, 'stack', Date.now()), links)),
    stopWatching: (found: Session) => change(found, withoutWatching),
    stopWatch: (found: Session, pull: PullRef) => change(found, links => withWatch(links, pull, false)),
    recordEnd(pull: PullRef, ended: number | undefined) {
      for (const id of linking(pull)) {
        const found = deps.sessions.open(id)
        if (found) changeUnseen(found, withEnd(id, pull, ended))
      }
    },
    tell: (found: Session, pull: PullRef, told: Phase) => changeUnseen(found, links => withTold(links, pull, told)),
    engage: (found: Session, at: number) => changeUnseen(found, links => withEngaged(links, at)),
    wrote(found: Session, at: number) {
      writes.set(found.id, at)
      changeUnseen(found, links => withEngaged(links, at))
    },
    forget: (id: string) => void writes.delete(id),
    mark: (found: Session, pull: PullRef, mark: WatchMark, quiet: number, keepWatching: boolean) =>
      change(found, links => withMark(links, pull, mark, quiet, keepWatching)),
  }
}

export type ThreadLinks = ReturnType<typeof createThreadLinks>
