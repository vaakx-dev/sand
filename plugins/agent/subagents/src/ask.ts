import type { Session } from '@sand/chats/contract'
import type { Tool } from '@sand/tools/contract'
import { turnPending } from '@sand/turns-contract/contract'
import { z } from 'zod'
import type { AgentsContext } from './context'
import { answered } from './tool'

const askInput = z.object({
  question: z.string().min(1).describe('One clear question, with the options you see and what you would pick'),
})

const answerInput = z.object({
  thread: z.string().min(1).describe('The subagent that asked'),
  answer: z.string().min(1).describe('Your answer, in plain words'),
  background: z.boolean().optional().describe('Return at once and get its reply later as a <task-notification>'),
})

const answerFor = (ctx: AgentsContext, session: Session, signal: AbortSignal) => {
  const before = new Set(ctx.turns.pending(session).map(item => item.id))
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const check = () => void (ctx.turns.pending(session).some(item => !item.held && !before.has(item.id)) && resolve())
  const quit = () => reject(signal.reason)
  const stop = ctx.on(turnPending, changed => void (changed.id === session.id && check()))
  signal.addEventListener('abort', quit, { once: true })
  return {
    heard: promise,
    stop() {
      void stop()
      signal.removeEventListener('abort', quit)
    },
  }
}

export const askTool = (ctx: AgentsContext): Tool<typeof askInput> => ({
  name: 'ask_caller',
  description:
    "Ask the agent that started you a question and wait for its answer, which comes as the next message. Use it only when you can't go on without the answer, like a choice only your caller or the user can make; otherwise decide for yourself and keep working.",
  timeoutMs: Infinity,
  effect: 'read',
  input: askInput,
  active: conversation => ctx.sessions.open(conversation.id)?.kind === 'agent',
  async run({ question }, { conversation, call, signal, wait }) {
    const session = ctx.sessions.require(conversation.id)
    const answer = answerFor(ctx, session, signal)
    const done = wait({ kind: 'question', call: call.id, title: question })
    try {
      await ctx.orchestrator.ask(session.id, question, call.id)
      await answer.heard
      return 'Your caller answered. Its answer is the next message.'
    } finally {
      done()
      answer.stop()
    }
  },
})

export const answerTool = (ctx: AgentsContext): Tool<typeof answerInput> => ({
  name: 'answer_agent',
  description: 'Answer a question a subagent you started asked you, then wait for its reply like the agent tool does.',
  timeoutMs: Infinity,
  act: ({ thread }) => ({ effect: 'send', uses: 'agents', summary: `Answer subagent ${thread}` }),
  input: answerInput,
  async run({ thread, answer, background }, { conversation, call, signal }) {
    const parent = ctx.sessions.require(conversation.id)
    const by = { owner: parent.owner, id: parent.id }
    await ctx.orchestrator.reply(thread, { prompt: answer, origin: 'agent', clientRequestId: `${parent.id}:${call.id}`, from: by })
    if (background || parent.owner === 'bot') return `Sent. Subagent ${thread} keeps working and its reply arrives as a <task-notification>.`
    return answered(await ctx.orchestrator.answer(thread, by, signal))
  },
})
