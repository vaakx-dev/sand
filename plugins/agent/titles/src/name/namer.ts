import type { LLM } from '@sand/llm-accounts/contract'
import type { UsageRecord } from '@sand/loops/contract'
import type { Message } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import type { Prefs } from '../prefs'
import { usageSource } from '@sand/kit'
import { askName } from './ask'
import { namingModel } from './model'
import { conversation } from './prompt'

const modelWait = 15_000

export const createNamer = (ctx: Context<'sessions'>, prefs: Prefs) => {
  const modelsReady = (llm: LLM) =>
    llm.models?.().length
      ? Promise.resolve()
      : new Promise<void>(resolve => {
          const done = () => {
            clearTimeout(timer)
            void off()
            resolve()
          }
          const timer = setTimeout(done, modelWait)
          const off = ctx.on('llm.models', done)
        })

  const name = async (session: Session, messages: Message[]) => {
    const llm = ctx.llm
    const text = conversation(messages)
    if (!llm || !text) return undefined
    await modelsReady(llm)
    const model = namingModel(llm, prefs.get().model, ctx.modelSettings?.effective(session).model)
    const reply = await askName(llm, text, model)
    if (!reply) return undefined
    const record: UsageRecord = { id: Bun.randomUUIDv7(), model, ...usageSource(llm, model), usage: reply.usage }
    ctx.sessions.open(session.id)?.append('usage', record)
    return reply.name || undefined
  }

  return {
    suggest: (session: Session) => name(session, session.messages()),
    async replace(session: Session, placeholder: string, prompt: Message) {
      const title = await name(session, [prompt]).catch(() => undefined)
      const live = ctx.sessions.open(session.id)
      if (title && live?.title === placeholder) live.rename(title, false)
    },
    async rename(session: Session) {
      const title = await name(session, session.messages())
      if (title) ctx.sessions.open(session.id)?.rename(title, false)
      return title
    },
  }
}

export type Namer = ReturnType<typeof createNamer>
