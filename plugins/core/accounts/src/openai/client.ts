import type { Media } from '@sand/media/contract'
import type { LLMEvent, LLMRequest, ModelInfo } from '../contract'
import type { Accounts } from '../auth/accounts'
import type { PlanRegistry } from '../auth/plans'
import { send } from '../http/send'
import { sseEvents } from '../http/sse'
import { reaching } from '../reach'
import { openaiBody } from './body'
import { keyCall } from './call'
import type { OpenAIEvent } from './events'
import { readOpenAI } from './reader'

interface OpenAIOptions {
  accounts: Accounts
  plans: PlanRegistry
  media: Media
  retries: number
  inspect(account: string): ((response: Response) => void) | undefined
}

export type OpenAI = ReturnType<typeof createOpenAI>

export const createOpenAI = ({ accounts, plans, media, retries, inspect }: OpenAIOptions) => {
  const prepare = async (account: string, request: LLMRequest & { model: string }, model: ModelInfo) => {
    const credential = await accounts.auth(account)
    const payload = openaiBody(request, model, media)
    return credential.type === 'api_key' ? keyCall(credential, payload) : plans.call(account, credential, payload)
  }

  return {
    async *stream(account: string, request: LLMRequest & { model: string }, model: ModelInfo, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      const call = await prepare(account, request, model)
      const name = accounts.label(account)
      const init = { method: 'POST', headers: call.headers(false), body: JSON.stringify(call.payload) }
      const response = await reaching(call.url, name, signal, () => send(call.url, init, { retries, signal, inspect: inspect(account) }))
      if (!response.body) throw new Error('Empty response body')
      yield* readOpenAI(sseEvents<OpenAIEvent>(response.body, name), request.model)
    },
  }
}
