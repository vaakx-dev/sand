import type { Limits, LLMEvent, LLMRequest } from '../contract'
import type { Accounts } from '../auth/accounts'
import { send } from '../http/send'
import { reaching } from '../reach'
import { claudeModels } from './models'
import { keyCall } from './key'
import { parseLimits } from './limits'
import { oauthCall } from './oauth'
import { read } from './reader'
import type { ClaudeCall, ClaudeSettings, Payload } from './request'
import { events } from './sse'
import { restoreNames } from './tools'

export interface ClaudeOptions {
  accounts: Accounts
  maxTokens: number
  thinking?: 'summarized' | 'omitted'
  retries: number
  onLimits(limits: Limits): void
  notify(text: string): void
}

export const createClaude = ({ accounts, maxTokens, thinking, retries, onLimits, notify }: ClaudeOptions) => {
  const settings = (model?: string): ClaudeSettings => ({ model: model ?? claudeModels[0]!, maxTokens, thinking })

  const prepare = async (account: string, request: LLMRequest, chosen: ClaudeSettings): Promise<ClaudeCall & { name: string }> => {
    const credential = await accounts.auth(account)
    const name = accounts.label(account)
    if (credential.type === 'oauth') return { ...oauthCall(credential.access, request, chosen), name }
    return { ...keyCall(credential, request, chosen), name }
  }

  const init = (call: ClaudeCall, payload: Payload): RequestInit => ({
    method: 'POST',
    headers: call.headers(payload.speed === 'fast'),
    body: JSON.stringify(payload),
  })

  const slower =
    (call: ClaudeCall, { speed: _, ...payload }: Payload) =>
    () => {
      notify('Fast mode is rate limited right now, so this reply runs at normal speed.')
      return init(call, payload)
    }

  const inspect = (account: string) => (response: Response) => {
    if (account !== 'claude') return
    const parsed = parseLimits(response.headers)
    if (parsed) onLimits(parsed)
  }

  return {
    async *stream(account: string, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      const call = await prepare(account, request, settings(request.model))
      const limited = 'speed' in call.payload ? slower(call, call.payload) : undefined
      const response = await reaching(call.url, call.name, signal, () =>
        send(call.url, init(call, call.payload), { retries, signal, inspect: inspect(account), limited }),
      )
      if (!response.body) throw new Error('Empty response body')
      yield* restoreNames(read(events(response.body)), call.original)
    },
    async probe() {
      const request: LLMRequest = { system: '', messages: [{ role: 'user', content: [{ type: 'text', text: '.' }] }], tools: [] }
      const call = await prepare('claude', request, { ...settings(), maxTokens: 1 })
      const response = await reaching(call.url, call.name, undefined, () => send(call.url, init(call, call.payload), { retries, inspect: inspect('claude') }))
      await response.body?.cancel()
    },
  }
}
