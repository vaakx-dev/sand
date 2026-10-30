import type { Media } from '@sand/media/contract'
import type { LLMEvent, LLMRequest, ModelInfo, Payload, PlanCall } from '../contract'
import type { Accounts } from '../auth/accounts'
import type { PlanRegistry } from '../auth/plans'
import { send } from '../http/send'
import { restoreNames } from '../http/tool-names'
import { reaching } from '../reach'
import { claudeBody, type ClaudeSettings } from './body'
import { keyCall } from './call'
import { read } from './reader'
import { events } from './sse'

interface ClaudeOptions {
  accounts: Accounts
  plans: PlanRegistry
  media: Media
  maxTokens: number
  retries: number
  inspect(account: string): ((response: Response) => void) | undefined
}

export type Claude = ReturnType<typeof createClaude>

export const createClaude = ({ accounts, plans, media, maxTokens, retries, inspect }: ClaudeOptions) => {
  const prepare = async (account: string, request: LLMRequest, settings: ClaudeSettings) => {
    const credential = await accounts.auth(account)
    if (credential.type === 'api_key') return keyCall(credential, request, settings, media)
    return plans.call(account, credential, claudeBody(request, settings, true, media), request.sessionKind)
  }

  const init = (call: PlanCall, payload: Payload): RequestInit => ({
    method: 'POST',
    headers: call.headers(payload.speed === 'fast'),
    body: JSON.stringify(payload),
  })

  const atNormalSpeed = (call: PlanCall) => () => {
    const { speed: _, ...payload } = call.payload
    return init(call, payload)
  }

  return {
    async *stream(account: string, request: LLMRequest & { model: string }, model: ModelInfo, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      const settings = { model: request.model, maxTokens: Math.min(maxTokens, model.maxOutput ?? maxTokens), efforts: model.efforts, fast: !!model.fast }
      const call = await prepare(account, request, settings)
      const limited = 'speed' in call.payload ? atNormalSpeed(call) : undefined
      const response = await reaching(call.url, accounts.label(account), signal, () =>
        send(call.url, init(call, call.payload), { retries, signal, inspect: inspect(account), limited }),
      )
      if (!response.body) throw new Error('Empty response body')
      const replies = read(events(response.body))
      yield* call.original ? restoreNames(replies, call.original) : replies
    },
  }
}
