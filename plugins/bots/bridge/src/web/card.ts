import type { BotViews } from '@sand/bots/contract'
import { markdown } from '@sand/markdown/contract'
import { joinDisposers } from '@sand/util'
import { threadChange } from '@sand/web-client/contract'
import { derive, div, dynamicChild, effect, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import type { BotReplyEntry } from '../contract'
import { answerOf, type Answer } from './answer'
import type { BridgeWeb } from './context'
import { botFace } from './face'
import type { Roster } from './roster'

const replyText = (ctx: BridgeWeb, text: string) => {
  const found = ctx.get(markdown)
  return found ? div({ class: 'leading-relaxed wrap-anywhere' }, ...found.nodes(text)) : div({ class: 'whitespace-pre-wrap wrap-anywhere' }, text)
}

const bodyOf = (ctx: BridgeWeb, answer: Answer): HTMLElement => {
  switch (answer.kind) {
    case 'working':
      return span({ class: 'text-neutral-500' }, 'Working…')
    case 'looking':
      return span({ class: 'text-neutral-500' }, ctx.kit.spinner('xs'))
    case 'reply':
      return replyText(ctx, answer.text)
    case 'note':
      return span({ class: 'text-neutral-500' }, answer.text)
  }
}

const byline = (ctx: BridgeWeb, roster: Roster, screens: Sig<BotViews | undefined>, bot: string) => {
  const look = 'flex min-w-0 items-center gap-2 text-xs'
  const who = () => [botFace(ctx, roster, bot, 16), span({ class: 'truncate' }, () => roster.find(bot)?.name || 'Bot')]
  return dynamicChild(screens, views =>
    views ? ctx.kit.linkButton({ class: look, onClick: () => views.open(bot, 'chat') }, ...who()) : span({ class: [look, 'text-neutral-400'] }, ...who()),
  )
}

export const replyCard = (ctx: BridgeWeb, roster: Roster, screens: Sig<BotViews | undefined>, { bot, turn }: BotReplyEntry) => {
  const version = sig(0)
  const answer = derive(() => {
    version.get()
    return answerOf(ctx.threads.get(bot), ctx.threads.path(bot), { ...(turn && { turn }), older: ctx.threads.older(bot) })
  })
  const shown = derive(() => JSON.stringify(answer.get()))
  const looking = derive(() => answer.get().kind === 'looking')
  const lookBack = () => {
    if (looking.get() && turn) void untrack(() => ctx.threads.findLast(bot, entry => entry.turn === turn))
  }
  const follow = () =>
    joinDisposers(
      ctx.threads.watch(bot),
      ctx.on(threadChange, changed => void (changed === bot && version.update(count => count + 1))),
      effect(lookBack),
    )
  return div(
    { class: 'my-4 flex max-w-2xl flex-col items-start gap-1.5 text-sm text-neutral-100', onMount: follow },
    byline(ctx, roster, screens, bot),
    dynamicChild(shown, () => bodyOf(ctx, answer.get())),
  )
}
