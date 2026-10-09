import { events, parseLimits, read, send } from '@sand/anthropic'
import type { LLMEvent, LLMRequest, Limits } from '@sand/protocol'
import { labels, subscriptions, type Accounts } from '../auth/accounts'
import { reaching } from '../reach'
import { keyCall } from './key'
import { oauthCall } from './oauth'
import type { ClaudeCall, ClaudeSettings, Payload } from './request'
import { restoreNames } from './tools'

export interface ClaudeOptions {
  accounts: Accounts
  settings: (model?: string) => ClaudeSettings
  retries: number
  onLimits(limits: Limits): void
  notify(text: string): void
}

export const createClaude = ({ accounts, settings, retries, onLimits, notify }: ClaudeOptions) => {
  const prepare = async (request: LLMRequest, chosen: ClaudeSettings): Promise<ClaudeCall & { name: string }> => {
    const credential = await accounts.auth('anthropic')
    if (credential.type === 'oauth') return { ...oauthCall(credential.access, request, chosen), name: subscriptions.anthropic }
    return { ...keyCall(credential, request, chosen), name: labels.anthropic }
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

  const inspect = (response: Response) => {
    const parsed = parseLimits(response.headers)
    if (parsed) onLimits(parsed)
  }

  return {
    async *stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      const call = await prepare(request, settings(request.model))
      const limited = 'speed' in call.payload ? slower(call, call.payload) : undefined
      const response = await reaching(call.url, call.name, signal, () => send(call.url, init(call, call.payload), { retries, signal, inspect, limited }))
      if (!response.body) throw new Error('Empty response body')
      yield* restoreNames(read(events(response.body)), call.original)
    },
    async probe() {
      const request: LLMRequest = { system: '', messages: [{ role: 'user', content: [{ type: 'text', text: '.' }] }], tools: [] }
      const call = await prepare(request, { ...settings(), maxTokens: 1 })
      const response = await reaching(call.url, call.name, undefined, () => send(call.url, init(call, call.payload), { retries, inspect }))
      await response.body?.cancel()
    },
  }
}
