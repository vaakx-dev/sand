import { notificationField } from '@sand/chats/contract'
import { pcHello, wire } from '@sand/devices-contract'
import { githubPulls, type Pull, pullOpened } from '@sand/github/contract'
import { inspector } from '@sand/inspector/contract'
import { wireValues } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { sig, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type Item, itemsOf, pullRows } from './rows'
import { PULL_NOTICE, pullFollow, pullFollows, pullFollowsChangeWire, pullUnfollow } from '../contract'

const placeKey = ({ device, cwd }: Subject) => `${device}\0${cwd ?? ''}`

export default definePlugin({
  name: 'pull-watch-web',
  description: "The pull requests of a thread in its details, with which ones it follows and a menu to follow or stop following each, and an eye on their wakes in the chat",
  inject: { wire, kit, inspector },
  apply(ctx) {
    const followed = wireValues(ctx, ctx.wire, {
      key: (thread: string) => thread,
      read: thread => ctx.wire.call(pullFollows, { thread }),
      change: pullFollowsChangeWire,
      changed: payload => payload,
    })
    const follow = (thread: string, pull: string) => ctx.wire.call(pullFollow, { thread, pull })
    const unfollow = (thread: string, pull: string) => ctx.wire.call(pullUnfollow, { thread, pull })
    const notices = toastsOf(ctx)
    const branchPulls = sig<ReadonlyMap<string, Pull[]>>(new Map())
    const asked = new Map<string, Subject>()

    const loadPulls = (subject: Subject) => {
      const key = placeKey(subject)
      asked.set(key, subject)
      if (!subject.cwd) return
      void ctx.wire.call(githubPulls, { cwd: subject.cwd }, subject.device).then(
        found => branchPulls.update(known => new Map(known).set(key, found ?? [])),
        () => {},
      )
    }

    const pullsAt = (subject: Subject) => {
      if (!asked.has(placeKey(subject))) untrack(() => loadPulls(subject))
      return branchPulls.get().get(placeKey(subject)) ?? []
    }

    const items = (subject: Subject) => itemsOf(followed(subject.session) ?? [], pullsAt(subject))

    const act = (title: string, run: () => Promise<unknown>) =>
      run().catch(error => {
        notices.error(title, error)
      })

    ctx.on(pcHello, device => {
      for (const subject of asked.values()) if (subject.device === device) loadPulls(subject)
    })
    ctx.on(pullOpened, (session, pull) => void act("Couldn't follow the PR", () => follow(session, pull.url)))
    ctx.watch(transcript, found => found?.notice(PULL_NOTICE, { icon: 'pull-request', title: text => notificationField(text, 'label') }))
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'pulls',
        group: 'git',
        order: 40,
        shows: subject => !subject.draft && subject.owner === 'thread' && items(subject).length > 0,
        render: subject =>
          pullRows(ctx.kit, {
            items: () => items(subject()),
            follow: (item: Item) => act("Couldn't follow the PR", () => follow(subject().session, item.url)),
            unfollow: (item: Item) => act("Couldn't stop following the PR", () => unfollow(subject().session, item.url)),
            open: ctx.kit.openTab,
          }),
      }),
    )
  },
})
