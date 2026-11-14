import { pcHello, type Wire } from '@sand/devices-contract'
import { githubPulls, type Pull } from '@sand/github/contract'
import { wireValues } from '@sand/reactive'
import type { Subject } from '@sand/ui-shell/contract'
import { errorMessage } from '@sand/util'
import { sig, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { pullFollow, pullFollows, pullFollowsChangeWire, pullTalk, pullUnfollow } from '../contract'
import { type Item, itemsOf } from './rows'
import type { Loaded } from './talk'

const placeKey = ({ device, cwd }: Subject) => `${device}\0${cwd ?? ''}`

const talkKey = ({ url, changed = 0 }: Item) => `${url}@${changed}`

const keyedSig = <T>() => sig<ReadonlyMap<string, T>>(new Map())

export const pullModel = (ctx: Context, wire: Wire) => {
  const followed = wireValues(ctx, wire, {
    key: (thread: string) => thread,
    read: thread => wire.call(pullFollows, { thread }),
    change: pullFollowsChangeWire,
    changed: payload => payload,
  })
  const branchPulls = keyedSig<Pull[]>()
  const talks = keyedSig<Loaded>()
  const asked = new Map<string, Subject>()
  const talkAsked = new Set<string>()

  const loadPulls = (subject: Subject) => {
    const key = placeKey(subject)
    asked.set(key, subject)
    if (!subject.cwd) return
    void wire.call(githubPulls, { cwd: subject.cwd }, subject.device).then(
      found => branchPulls.update(known => new Map(known).set(key, found ?? [])),
      () => {},
    )
  }

  const pullsAt = (subject: Subject) => {
    if (!asked.has(placeKey(subject))) untrack(() => loadPulls(subject))
    return branchPulls.get().get(placeKey(subject)) ?? []
  }

  const loadTalk = (item: Item) => {
    talkAsked.add(talkKey(item))
    const keep = (loaded: Loaded) => talks.update(known => new Map(known).set(item.url, loaded))
    void wire.call(pullTalk, { pull: item.url }).then(
      talk => keep({ talk }),
      error => keep({ error: errorMessage(error) }),
    )
  }

  ctx.on(pcHello, device => {
    for (const subject of asked.values()) if (subject.device === device) loadPulls(subject)
  })

  return {
    items: (subject: Subject) => itemsOf(followed(subject.session) ?? [], pullsAt(subject)),
    follow: (thread: string, pull: string) => wire.call(pullFollow, { thread, pull }),
    unfollow: (thread: string, pull: string) => wire.call(pullUnfollow, { thread, pull }),
    talk(item: Item) {
      if (!talkAsked.has(talkKey(item))) untrack(() => loadTalk(item))
      return talks.get().get(item.url)
    },
  }
}

export type PullModel = ReturnType<typeof pullModel>
