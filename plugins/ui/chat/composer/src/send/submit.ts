import { feedbackOnly, hasToolResult, type Message, type Prompt, type UserContent } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import { models, type SendOptions } from '@sand/web-client/contract'
import { compose, contentName } from '../attachments/content'
import type { ComposerContext } from '../context'

const prompt = (text: string, attachments: UserContent[]): Prompt => (attachments.length ? compose(text, attachments) : text)

const label = (text: string, attachments: UserContent[]) => text || attachments.map(contentName).join(', ')

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
  if (current?.running) await ctx.turns.interrupt(current.id)
}

export const submit = async (ctx: ComposerContext, text: string, attachments: UserContent[], settings: SessionSettings, options: Pick<SendOptions, 'mode' | 'clientRequestId'>) => {
  if (!text && !attachments.length) return interrupt(ctx)
  const current = ctx.threads.current()
  const draft = ctx.threads.drafting()
  const thread = current ?? (draft && (await ctx.threads.create(draft)))
  if (!thread) throw new Error('Pick a project for a new thread first')
  if (!current) await ctx.threads.select(thread.id, { replace: true })
  await ctx.turns.send(thread.id, prompt(text, attachments), { label: label(text, attachments), settings: current ? undefined : settings, ...options })
}

const asked = (message: Message) => message.role === 'user' && !hasToolResult(message) && !feedbackOnly(message)

export const retry = async (ctx: ComposerContext) => {
  const thread = ctx.threads.current()
  if (!thread || thread.running) return
  const entry = await ctx.threads.findLast(thread.id, candidate => candidate.type === 'message' && asked(candidate.data as Message))
  if (!entry) return
  const content = (entry.data as Message).content as UserContent[]
  await ctx.threads.checkout(thread.id, entry.parent)
  await ctx.turns.send(thread.id, content, { label: label('', content.filter(block => block.type !== 'text')) || 'Retry' })
}
