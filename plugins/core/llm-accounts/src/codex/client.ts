import type { Limits, LLMEvent, LLMRequest } from '../contract'
import type { Accounts } from '../auth/accounts'
import { send } from '../http/send'
import { sseEvents } from '../http/sse'
import { reaching } from '../reach'
import { codexBody } from './body'
import type { CodexEvent } from './events'
import { codexLimitReached, parseCodexLimits } from './limits'
import { codexModels } from './models'
import { readCodex } from './reader'
import { codexTarget } from './target'

interface CodexOptions {
  accounts: Accounts
  retries: number
  onLimits(limits: Limits): void
}

export type Codex = ReturnType<typeof createCodex>

export const createCodex = ({ accounts, retries, onLimits }: CodexOptions) => {
  const report = (limits?: Limits) => limits && onLimits(limits)

  const inspect = (account: string) => (response: Response) => {
    if (account !== 'codex') return
    const parsed = parseCodexLimits(response.headers)
    if (response.status !== 429) return report(parsed)
    void codexLimitReached(response, parsed).then(
      found => report(found ?? parsed),
      () => report(parsed),
    )
  }

  return {
    async *stream(account: string, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
      const credential = await accounts.auth(account)
      const id = request.model ?? codexModels[0]!
      const payload = codexBody(request, id)
      const { url, headers } = codexTarget(credential, payload.prompt_cache_key)
      const name = accounts.label(account)
      const init = { method: 'POST', headers, body: JSON.stringify(payload) }
      const response = await reaching(url, name, signal, () => send(url, init, { retries, signal, inspect: inspect(account) }))
      if (!response.body) throw new Error('Empty response body')
      yield* readCodex(sseEvents<CodexEvent>(response.body, 'ChatGPT'), id)
    },
  }
}
