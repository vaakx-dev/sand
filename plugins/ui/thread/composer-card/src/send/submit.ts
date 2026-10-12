import type { Message, Prompt, UserContent } from '@sand/messages'
import type { FollowUpMode } from '@sand/web-client/contract'
import { feedbackOnly, hasToolResult, parseCommand } from '@sand/kit'
import type { Context } from 'drydock'
import { compose, contentName } from '../attachments/content'

const runCommand = async (ctx: Context<'threads'>, name: string, args: string) => {
  if (!ctx.commands?.get(name)) return ctx.threads.command(name, args)
  await ctx.commands.run(name, args)
}

const prompt = (text: string, attachments: UserContent[]): Prompt => (attachments.length ? compose(text, attachments) : text)

const label = (text: string, attachments: UserContent[]) => text || attachments.map(contentName).join(', ')

export const modelMissing = (ctx: Context) => {
  const current = ctx.models?.state()?.current
  return Boolean(current && !current.model)
}

export const sendDevice = (ctx: Context<'threads'>) => {
  const current = ctx.threads.current()
  return current ? current.device : ctx.threads.device()
}

export const chooseModel = (ctx: Context<'threads'>) => runCommand(ctx, 'model', '')

export const interrupt = async (ctx: Context<'threads' | 'turns'>) => {
  const current = ctx.threads.current()
  if (current?.running) await ctx.turns.interrupt(current.id)
}

export const submit = async (ctx: Context<'threads' | 'turns'>, text: string, attachments: UserContent[], mode?: FollowUpMode) => {
  if (!text && !attachments.length) return interrupt(ctx)
  const command = attachments.length ? undefined : parseCommand(text)
  if (command) return runCommand(ctx, command.name, command.args)
  const current = ctx.threads.current()
  const thread = current ?? (await ctx.threads.create({ settings: ctx.models?.draft() }))
  if (!current) {
    ctx.models?.prepare()
    await ctx.threads.select(thread.id, { replace: true })
  }
  await ctx.turns.send(thread.id, prompt(text, attachments), label(text, attachments), mode)
}

const asked = (message: Message) => message.role === 'user' && !hasToolResult(message) && !feedbackOnly(message)

export const retry = async (ctx: Context<'threads' | 'turns'>) => {
  const thread = ctx.threads.current()
  if (!thread || thread.running) return
  const entry = await ctx.threads.findLast(thread.id, candidate => candidate.type === 'message' && asked(candidate.data as Message))
  if (!entry) return
  const content = (entry.data as Message).content as UserContent[]
  await ctx.threads.checkout(thread.id, entry.parent)
  await ctx.turns.send(thread.id, content, label('', content.filter(block => block.type !== 'text')) || 'Retry')
}
