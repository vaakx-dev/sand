import type { llm } from '@sand/accounts/contract'
import { roleOfLevel, type modelSettings } from '@sand/model/contract'
import { sessions } from '@sand/chats/contract'
import { usageRecord } from '@sand/usage/contract'
import type { Context } from 'drydock'
import type { AskRequest } from './contract'
import { reply } from './reply'

export type AskContext = Context<{ llm: typeof llm; modelSettings: typeof modelSettings }>

const noModel = 'No model available. Sign in to a model provider in Settings › Accounts.'

const roleOf = (request: AskRequest) => ('role' in request ? request.role : roleOfLevel(request.level))

const charsPerToken = 4
const promptShare = 0.6

const capped = (prompt: string, context: number | undefined) => (context ? prompt.slice(0, Math.floor(context * promptShare * charsPerToken)) : prompt)

export const createText =
  (ctx: AskContext) =>
  async (request: AskRequest) => {
    const { system, prompt, session: id, signal } = request
    const { model, effort, speed } = ctx.modelSettings.role(roleOf(request))
    if (!model) throw new Error(noModel)
    const session = id ? ctx.get(sessions)?.open(id) : undefined
    const text = capped(prompt, ctx.llm.find?.(model)?.context)
    const release = ctx.busy()
    try {
      const answer = await reply(
        ctx.llm,
        { system, messages: [{ role: 'user', content: [{ type: 'text', text }] }], tools: [], model, ...(effort && { effort }), ...(speed && { speed }) },
        signal,
      )
      session?.append('usage', usageRecord(ctx.llm.provider?.(model), model, answer.usage, answer.source))
      return answer.text
    } finally {
      release()
    }
  }
