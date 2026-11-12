import { promptOf } from '@sand/attachments/contract'
import { labelOf } from '@sand/attachments/web/contract'
import { feedbackOnly, hasToolResult, promptText, userParts, type Entry, type Message, type UserContent } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import { models } from '@sand/web-client/contract'
import type { ComposerContext } from '../context'
import type { Outgoing } from '../target'

export const modelMissing = (ctx: ComposerContext, settings: SessionSettings) => {
  if (!ctx.threads.current()) return !settings.model
  const current = ctx.get(models)?.state()?.current
  return Boolean(current && !current.model)
}

export const sendDevice = (ctx: ComposerContext) => {
  const current = ctx.threads.current()
  return current ? current.device : ctx.threads.device()
}

export const interrupt = async (ctx: ComposerContext) => {
  const current = ctx.threads.current()
  if (current?.turn) await ctx.turns.stop(current.id)
}

export const submit = async (ctx: ComposerContext, text: string, attachments: UserContent[], settings: SessionSettings, options: Outgoing) => {
  const current = ctx.threads.current()
  const prompt = promptOf(text, attachments)
  const label = labelOf(text, attachments)
  if (current) return ctx.turns.send(current.id, prompt, { label, ...options })
  const draft = ctx.threads.drafting()
  if (!draft) throw new Error('Pick a project for a new thread first')
  await ctx.threads.start(draft, { prompt, label, settings })
}

const typedContent = (content: UserContent[]) =>
  content.flatMap((block): UserContent[] => {
    if (block.type !== 'text' || block.typed === undefined) return [block]
    return block.typed ? [{ type: 'text', text: block.typed }] : []
  })

const asked = (message: Message) => message.role === 'user' && !hasToolResult(message) && !feedbackOnly(message)

const prompted = (entry: Entry) => entry.type === 'message' && asked(entry.data as Message)

export const lastPrompt = (path: Entry[]) => {
  const entry = path.findLast(prompted)
  if (!entry) return undefined
  const message = entry.data as Message
  return { text: promptText(message), records: userParts(message).flatMap(part => (part.kind === 'context' ? part.records : [])) }
}

export const retry = async (ctx: ComposerContext) => {
  const thread = ctx.threads.current()
  if (!thread || thread.turn) return
  const entry = await ctx.threads.findLast(thread.id, prompted)
  if (!entry) return
  const content = typedContent((entry.data as Message).content as UserContent[])
  await ctx.threads.checkout(thread.id, entry.parent)
  await ctx.turns.send(thread.id, content, { label: labelOf('', content.filter(block => block.type !== 'text' && block.type !== 'context')) || 'Retry' })
}
