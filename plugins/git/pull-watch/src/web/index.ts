import { notificationField } from '@sand/chats/contract'
import { composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { pullOpened } from '@sand/github/contract'
import { inspector } from '@sand/inspector/contract'
import { markdown } from '@sand/markdown/contract'
import { panel } from '@sand/panel/contract'
import { toastsOf } from '@sand/toasts/contract'
import { transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell, type Subject } from '@sand/ui-shell/contract'
import { definePlugin } from 'drydock'
import { pullModel } from './model'
import { type Item, pullRows } from './rows'
import { talkPanel } from './talk'
import { PULL_NOTICE } from '../contract'

const TAB = 'pull'

const shows = (subject: Subject, items: Item[]) => !subject.draft && subject.owner === 'thread' && items.length > 0

export default definePlugin({
  name: 'pull-watch-web',
  description:
    "A thread's pull requests: in its details, which ones it follows with a menu to follow or stop following each; in the side panel, their review and conversation comments, each one addable to the chat as a quote; and an eye on their wakes in the chat",
  inject: { wire, kit, inspector, markdown },
  apply(ctx) {
    const model = pullModel(ctx, ctx.wire)
    const notices = toastsOf(ctx)

    const act = (title: string, run: () => Promise<unknown>) =>
      run().catch(error => {
        notices.error(title, error)
      })

    const following = (subject: () => Subject) => ({
      follow: (item: Item) => act("Couldn't follow the PR", () => model.follow(subject().session, item.url)),
      unfollow: (item: Item) => act("Couldn't stop following the PR", () => model.unfollow(subject().session, item.url)),
    })

    const quote = (text: string) => {
      ctx.get(shell)?.showChat()
      ctx.get(composer)?.quote(text)
    }

    const show = (item: Item) => {
      const found = ctx.get(panel)
      if (found) found.show(TAB)
      else ctx.kit.openTab(item.url)
    }

    ctx.on(pullOpened, (session, pull) => void act("Couldn't follow the PR", () => model.follow(session, pull.url)))
    ctx.watch(transcript, found => found?.notice(PULL_NOTICE, { icon: 'pull-request', title: text => notificationField(text, 'label') }))
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'pulls',
        group: 'git',
        order: 40,
        shows: subject => shows(subject, model.items(subject)),
        render: subject =>
          pullRows(ctx.kit, { items: () => model.items(subject()), show }),
      }),
    )
    ctx.watch(panel, found =>
      found?.tab({
        id: TAB,
        label: 'Pull request',
        icon: 'pull-request',
        order: 30,
        shows: subject => shows(subject, model.items(subject)),
        render: subject =>
          talkPanel({
            kit: ctx.kit,
            markdown: ctx.markdown,
            items: () => model.items(subject()),
            talk: model.talk,
            ...following(subject),
            quote,
          }),
      }),
    )
  },
})
