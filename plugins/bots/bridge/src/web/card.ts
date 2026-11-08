import { botChangeWire, botViews } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { markdown } from '@sand/markdown/contract'
import { joinDisposers } from '@sand/util'
import { div, dynamicChild, resource, show, span } from '@vaakx-dev/vrui'
import { type BotAnswer, botAwait } from '@sand/bots-mcp/contract'
import type { BotReplyEntry } from '../contract'
import type { BridgeWeb } from './context'
import { botFace } from './face'
import type { Roster } from './roster'

const notes: Partial<Record<BotAnswer['status'], string>> = {
  queued: 'Waiting its turn',
  waiting: 'Waiting for you in Bots',
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

const openButton = (ctx: BridgeWeb, bot: string) =>
  show(
    () => Boolean(ctx.get(botViews)),
    () => ctx.kit.quietButton({ size: 'sm', onClick: () => ctx.get(botViews)?.open(bot) }, 'Open in Bots'),
  )

export const replyCard = (ctx: BridgeWeb, roster: Roster, { bot, turn }: BotReplyEntry) => {
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
    {
      class: 'my-3 max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100',
      onMount: follow,
    },
    div(
      { class: 'mb-1.5 flex h-6 items-center gap-2 text-xs text-neutral-400' },
      botFace(ctx, roster, bot, 20),
      span({ class: 'min-w-0 flex-1 truncate font-medium text-neutral-100' }, () => roster.find(bot)?.name || 'Bot'),
      openButton(ctx, bot),
    ),
    dynamicChild(answer.data, found => bodyOf(ctx, found)),
  )
}
