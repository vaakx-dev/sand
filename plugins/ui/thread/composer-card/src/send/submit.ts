import type { Message, Prompt, UserContent } from '@sand/messages'
import type { FollowUpMode } from '@sand/web-client/contract'
import { feedbackOnly, hasToolResult, parseCommand } from '@sand/kit'
import type { Context } from 'drydock'
import { compose, contentName } from '../attachments/content'

export const runCommand = async (ctx: Context<'threads'>, name: string, args = '') => {
  if (ctx.commands?.get(name)) return void (await ctx.commands.run(name, args))
  if (!ctx.wire) throw new Error(`No command host is loaded to run /${name}`)
  await ctx.wire.call({ type: 'ui.command', name, args, session: ctx.threads.current()?.id, cwd: ctx.threads.cwd() })
}

const prompt = (text: string, attachments: UserContent[]): Prompt => (attachments.length ? compose(text, attachments) : text)

const label = (text: string, attachments: UserContent[]) => text || attachments.map(contentName).join(', ')

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
    await ctx.threads.select(thread.id)
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
