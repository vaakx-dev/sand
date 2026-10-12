import type { LLMEvent, LLMRequest, Payload, PlanCall } from '../contract'
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
  maxTokens: number
  retries: number
  inspect(account: string): ((response: Response) => void) | undefined
  notify(text: string): void
}

export type Claude = ReturnType<typeof createClaude>

export const createClaude = ({ accounts, plans, maxTokens, retries, inspect, notify }: ClaudeOptions) => {
  const prepare = async (account: string, request: LLMRequest, settings: ClaudeSettings) => {
    const credential = await accounts.auth(account)
    if (credential.type === 'api_key') return keyCall(credential, request, settings)
    return plans.call(account, credential, claudeBody(request, settings, true))
  }

  const init = (call: PlanCall, payload: Payload): RequestInit => ({
    method: 'POST',
    headers: call.headers(payload.speed === 'fast'),
    body: JSON.stringify(payload),
  })

  const atNormalSpeed = (call: PlanCall) => () => {
    notify('Fast mode is rate limited right now, so this reply runs at normal speed.')
    const { speed: _, ...payload } = call.payload
    return init(call, payload)
  }

  return {
    async *stream(account: string, request: LLMRequest & { model: string }, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      const call = await prepare(account, request, { model: request.model, maxTokens })
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
