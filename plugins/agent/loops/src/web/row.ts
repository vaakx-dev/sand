import type { Entry } from '@sand/messages'
import { button, div, errorMessage, span } from '@sand/dom'
import type { Context } from 'drydock'
import type { LoopChoice } from '../contract'

type ViewContext = Context<'wire' | 'threads'>

const nameOf = (entry: Entry | undefined) => (entry?.data as LoopChoice | undefined)?.name ?? null

const previousName = (ctx: ViewContext, entry: Entry, thread: string) => {
  const path = ctx.threads.path(thread)
  const index = path.findIndex(item => item.id === entry.id)
  return nameOf((index < 0 ? path : path.slice(0, index)).findLast(item => item.type === 'loop'))
}

const labelOf = (ctx: ViewContext, name: string | null) =>
  name ? (ctx.wire.hello()?.loops?.find(loop => loop.name === name)?.label ?? name) : 'Default'

const switchTo = (ctx: ViewContext, thread: string, loop: string | null) =>
  void ctx.wire
    .call({ type: 'loop.choose', session: thread, loop }, ctx.threads.get(thread)?.device)
    .catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))

export const loopRow = (ctx: ViewContext) => (entry: Entry, thread: string) => {
  const choice = entry.data as LoopChoice
  const previous = previousName(ctx, entry, thread)
  const text = `Loop: ${labelOf(ctx, choice.name)}${choice.reason ? ` (${choice.reason})` : ''}`
  return div(
    { class: 'mt-2 mb-4 flex items-center justify-center gap-2 text-xs text-neutral-500' },
    span({ class: 'min-w-0 truncate', title: text }, text),
    previous === choice.name
      ? ''
      : button({ type: 'button', class: 'shrink-0 cursor-pointer underline hover:text-neutral-200', onClick: () => switchTo(ctx, thread, previous) }, 'Switch back'),
  )
}
