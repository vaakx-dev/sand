import type { Limits, LLMEvent, LLMRequest } from '../contract'
import type { Accounts } from '../auth/accounts'
import { send } from '../http/send'
import { restoreNames } from '../http/tool-names'
import { reaching } from '../reach'
import type { ClaudeSettings } from './body'
import { claudeCall, type ClaudeCall, type Payload } from './call'
import { parseLimits } from './limits'
import { claudeModels } from './models'
import { read } from './reader'
import { events } from './sse'
import { fetchClaudeLimits } from './usage'

interface ClaudeOptions {
  accounts: Accounts
  maxTokens: number
  retries: number
  onLimits(limits: Limits): void
  notify(text: string): void
}

export type Claude = ReturnType<typeof createClaude>

export const createClaude = ({ accounts, maxTokens, retries, onLimits, notify }: ClaudeOptions) => {
  const settings = (model?: string): ClaudeSettings => ({ model: model ?? claudeModels[0]!, maxTokens })

  const prepare = async (account: string, request: LLMRequest, chosen: ClaudeSettings) => ({
    ...claudeCall(await accounts.auth(account), request, chosen),
    name: accounts.label(account),
  })

  const init = (call: ClaudeCall, payload: Payload): RequestInit => ({
    method: 'POST',
    headers: call.headers(payload.speed === 'fast'),
    body: JSON.stringify(payload),
  })

  const atNormalSpeed = (call: ClaudeCall) => () => {
    notify('Fast mode is rate limited right now, so this reply runs at normal speed.')
    const { speed: _, ...payload } = call.payload
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
      const limited = 'speed' in call.payload ? atNormalSpeed(call) : undefined
      const response = await reaching(call.url, call.name, signal, () =>
        send(call.url, init(call, call.payload), { retries, signal, inspect: inspect(account), limited }),
      )
      if (!response.body) throw new Error('Empty response body')
      yield* restoreNames(read(events(response.body)), call.original)
    },
    async checkLimits() {
      const credential = await accounts.auth('claude')
      if (credential.type !== 'oauth') return
      onLimits(await fetchClaudeLimits(credential.access, accounts.label('claude'), retries))
    },
  }
}
