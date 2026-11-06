import { botChat } from '@sand/bots/contract'
import { layout, layoutChange } from '@sand/layout/contract'
import { markdown } from '@sand/markdown/contract'
import { pullLinksClient } from '@sand/pull-links/contract'
import { pulse } from '@sand/reactive'
import { threadChange, threadsChange } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { workPanel } from './panel'
import { followRunning } from './follow'
import { createPlan } from './plan'
import { createRoster } from './roster'
import { summaryLine } from './summary'
import { tasksOf } from './tasks'

export default definePlugin({
  name: 'bot-work',
  description: "Shows beside a bot's chat the threads it started by state, with its plan, a summary line above the composer, and opens each thread in place",
  inject,
  apply(ctx) {
    const roster = createRoster(ctx)
    const shell = pulse(ctx, [threadsChange, layoutChange], [layout, markdown, pullLinksClient])
    ctx.on(threadChange, shell.schedule)
    const narrow = shell.read(() => ctx.get(layout)?.state().narrow ?? false)
    const renderer = shell.read(() => ctx.get(markdown))

    const startedBy = (bot: string) => roster.startedBy(bot).flatMap(id => ctx.threads.get(id) ?? [])
    const sources = { pullsOf: (thread: string) => ctx.get(pullLinksClient)?.of(thread) ?? [], earlierFailure: roster.failure }
    const tasksFor = (bot: string) => shell.read(() => tasksOf(startedBy(bot), sources))

    const partsFor = (bot: string) => ({
      tasks: tasksFor(bot),
      started: () => roster.startedBy(bot).length > 0,
      startsThreads: roster.startsThreads,
      plan: createPlan(ctx, bot),
      markdown: renderer,
    })

    ctx.watch(botChat, chat =>
      chat?.part({
        id: 'work',
        order: 10,
        beside: bot => workPanel(ctx, partsFor(bot)),
        above: bot => {
          const parts = partsFor(bot)
          followRunning(ctx, parts.tasks)
          return summaryLine(ctx, { ...parts, narrow, name: () => roster.name(bot) })
        },
      }),
    )
  },
})
