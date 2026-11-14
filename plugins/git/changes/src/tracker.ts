import type { SessionInfo } from '@sand/chats/contract'
import type { InputOf } from '@sand/host-hub/contract'
import { joinDisposers, keyedSerial } from '@sand/util'
import type { Dispose } from 'drydock'
import { mayBeWorktree } from './checkout'
import type { changesList, ThreadChanges } from './contract'
import type { ChangesDeps } from './deps'
import { readChanges } from './read'

const quietMs = 300

interface Followed {
  cwd: string
  worktree: Promise<boolean>
  stop: Dispose
}

export const createTracker = (deps: ChangesDeps, send: (changes: ThreadChanges) => void) => {
  const followed = new Map<string, Followed>()
  const sent = new Map<string, string>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const inOrder = keyedSerial()

  const deliver = (changes: ThreadChanges) => {
    const json = JSON.stringify(changes)
    if (sent.get(changes.session) !== json) {
      sent.set(changes.session, json)
      send(changes)
    }
    return changes
  }

  const publish = (id: string) => inOrder(id, async () => deliver(await readChanges(deps, id)))

  const show = (changes: ThreadChanges) => inOrder(changes.session, async () => deliver(changes))

  const schedule = (id: string) => {
    clearTimeout(timers.get(id))
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        if (deps.sessions.open(id)) publish(id).catch(deps.report)
      }, quietMs),
    )
  }

  const poke = (id: string) => {
    followed
      .get(id)
      ?.worktree.then(inside => inside && schedule(id))
      .catch(deps.report)
  }

  const outOfWorktree = (id: string) => {
    if (sent.has(id)) schedule(id)
    return false
  }

  const watch = (id: string, cwd: string): Followed => {
    let stop: Dispose | undefined
    let stopped = false
    const layoutOf = async () => ((await mayBeWorktree(cwd)) ? deps.repos.layout(cwd) : undefined)
    const worktree = layoutOf().then(
      layout => {
        if (stopped) return false
        if (!layout?.worktree) return outOfWorktree(id)
        stop = joinDisposers(
          deps.repos.watchLocal(layout.root, () => schedule(id)),
          deps.repos.watchLocal(layout.main, () => schedule(id)),
        )
        schedule(id)
        return true
      },
      (error: unknown) => {
        deps.report(error)
        return false
      },
    )
    return {
      cwd,
      worktree,
      stop() {
        stopped = true
        stop?.()
      },
    }
  }

  const unfollow = (id: string) => {
    followed.get(id)?.stop()
    followed.delete(id)
  }

  const follow = (session: SessionInfo) => {
    const wanted = session.kind === 'thread' && session.archived === null
    const current = followed.get(session.id)
    if (wanted ? current?.cwd === session.cwd : !current) return
    unfollow(session.id)
    if (wanted) followed.set(session.id, watch(session.id, session.cwd))
    else schedule(session.id)
  }

  const forget = (id: string) => {
    unfollow(id)
    clearTimeout(timers.get(id))
    timers.delete(id)
    sent.delete(id)
  }

  const inWorktrees = async () => {
    const entries = [...followed]
    const inside = await Promise.all(entries.map(([, entry]) => entry.worktree))
    return entries.flatMap(([id], at) => (inside[at] ? [id] : []))
  }

  const list = async ({ sessions, project }: InputOf<typeof changesList>) => {
    const ids = (sessions ?? [...new Set([...(await inWorktrees()), ...deps.merged.sessions()])]).filter(id => deps.sessions.open(id))
    const all = await Promise.all(ids.map(id => readChanges(deps, id)))
    return all.filter(changes => (!project || changes.project === project) && (sessions || changes.state !== 'none' || changes.files.length > 0))
  }

  const close = () => {
    for (const id of [...followed.keys(), ...timers.keys()]) forget(id)
  }

  return { follow, forget, poke, publish, show, list, close }
}

export type Tracker = ReturnType<typeof createTracker>
