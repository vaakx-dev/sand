import type { Limits, LLMEvent, LLMRequest } from '../contract'
import type { Accounts } from '../auth/accounts'
import { send } from '../http/send'
import { reaching } from '../reach'
import { codexBody } from './body'
import { codexLimitReached, parseCodexLimits } from './limits'
import { codexModels } from './models'
import { readCodex } from './reader'
import { frames } from './sse'
import { codexTarget } from './target'

export interface CodexOptions {
  accounts: Accounts
  retries: number
  onLimits(limits: Limits): void
}

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
      yield* readCodex(frames(response.body), id)
    },
  }
}
