import { promptOf } from '@sand/attachments/contract'
import { labelOf } from '@sand/attachments/web/contract'
import { feedbackOnly, hasToolResult, promptText, userParts, type Entry, type Message, type UserContent } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import { models, threadsChange, type Thread } from '@sand/web-client/contract'
import { onTimeout } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import type { Destination, Outbound } from '../target'

export const modelMissing = (ctx: ComposerContext, settings: SessionSettings) => {
  if (!ctx.threads.current()) return !settings.model
  const current = ctx.get(models)?.state()?.current
  return Boolean(current && !current.model)
}

export const sendDevice = (ctx: ComposerContext) => {
  const current = ctx.threads.current()
  return current ? current.device : ctx.threads.device()
}

export const stoppable = (thread: Thread | undefined) => Boolean(thread?.turn) || (thread?.jobs.size ?? 0) > 0

export const interrupt = async (ctx: ComposerContext) => {
  const current = ctx.threads.current()
  if (current && stoppable(current)) await ctx.turns.stop(current.id)
}

const THREAD_WAIT_MS = 30_000

const known = (ctx: ComposerContext, id: string) =>
  new Promise<string>((resolve, reject) => {
    if (ctx.threads.get(id)) return resolve(id)
    const stop = () => {
      stopTimer()
      unwatch()
    }
    const stopTimer = onTimeout(() => {
      stop()
      reject(new Error('That thread is gone'))
    }, THREAD_WAIT_MS)
    const unwatch = ctx.on(threadsChange, () => {
      if (!ctx.threads.get(id)) return
      stop()
      resolve(id)
    })
  })

export const destination = (ctx: ComposerContext): Destination | undefined => {
  const device = sendDevice(ctx)
  const current = ctx.threads.current()
  if (current) return { conversation: current.id, device }
  const draft = ctx.threads.drafting()
  return draft && { conversation: draft.id, device, draft }
}

export const submit = async (ctx: ComposerContext, thread: string | undefined, to: Destination, { id, text, content, settings, mode }: Outbound) => {
  const prompt = promptOf(text, content)
  const label = labelOf(text, content)
  if (thread) return ctx.turns.send(await known(ctx, thread), prompt, { label, mode, clientRequestId: id })
  if (!to.draft) throw new Error('Pick a project for a new thread first')
  await ctx.threads.start(to.draft, { prompt, label, settings })
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
