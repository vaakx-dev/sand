import { botChangeWire, type BotViews } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { markdown } from '@sand/markdown/contract'
import { joinDisposers } from '@sand/util'
import { div, dynamicChild, resource, span, type Sig } from '@vaakx-dev/vrui'
import { type BotAnswer, botAwait } from '@sand/bots-mcp/contract'
import type { BotReplyEntry } from '../contract'
import type { BridgeWeb } from './context'
import { botFace } from './face'
import type { Roster } from './roster'

const notes: Partial<Record<BotAnswer['status'], string>> = {
  queued: 'Waiting its turn',
  waiting: 'Waiting for you in its chat',
  interrupted: 'Stopped',
  failed: "Couldn't answer",
  lost: "Couldn't answer",
}

const replyText = (ctx: BridgeWeb, text: string) => {
  const found = ctx.get(markdown)
  return found ? div({ class: 'leading-relaxed wrap-anywhere' }, ...found.nodes(text)) : div({ class: 'whitespace-pre-wrap wrap-anywhere' }, text)
}

const bodyOf = (ctx: BridgeWeb, answer: BotAnswer | undefined): HTMLElement => {
  if (!answer || answer.status === 'running') return span({ class: 'text-neutral-500' }, 'Working…')
  if (answer.reply) return replyText(ctx, answer.reply)
  if (answer.error) return ctx.kit.errorText(answer.error)
  return span({ class: 'text-neutral-500' }, notes[answer.status] ?? 'No reply')
}

const ongoing = new Set<BotAnswer['status']>(['running', 'queued', 'waiting'])

const byline = (ctx: BridgeWeb, roster: Roster, screens: Sig<BotViews | undefined>, bot: string) => {
  const look = 'flex min-w-0 items-center gap-2 text-xs'
  const who = () => [botFace(ctx, roster, bot, 16), span({ class: 'truncate' }, () => roster.find(bot)?.name || 'Bot')]
  return dynamicChild(screens, views =>
    views ? ctx.kit.linkButton({ class: look, onClick: () => views.open(bot) }, ...who()) : span({ class: [look, 'text-neutral-400'] }, ...who()),
  )
}

export const replyCard = (ctx: BridgeWeb, roster: Roster, screens: Sig<BotViews | undefined>, { bot, turn }: BotReplyEntry) => {
  const answer = resource(() => (turn ? ctx.wire.call(botAwait, { bot, turn, timeoutMs: 0 }) : Promise.resolve<BotAnswer>({ bot, status: 'queued' })), { lazy: true })
  const unsettled = () => {
    const found = answer.data.get()
    return !found || ongoing.has(found.status)
  }
  const follow = () => {
    if (ctx.wire.ready()) answer.refetch()
    return joinDisposers(
      ctx.on(wireHello, answer.refetch),
      ctx.wire.on(botChangeWire, changed => void (changed.id === bot && unsettled() && answer.refetch())),
    )
  }
  return div(
    { class: 'my-4 flex max-w-2xl flex-col items-start gap-1.5 text-sm text-neutral-100', onMount: follow },
    byline(ctx, roster, screens, bot),
    dynamicChild(answer.data, found => bodyOf(ctx, found)),
  )
}
