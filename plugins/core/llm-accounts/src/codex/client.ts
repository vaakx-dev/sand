import type { LLMEvent, LLMRequest } from '../contract'
import type { Accounts } from '../auth/accounts'
import { send } from '../http/send'
import { reaching } from '../reach'
import { codexBody } from './body'
import { codexModels } from './models'
import { readCodex } from './reader'
import { frames } from './sse'
import { codexTarget } from './target'

export interface CodexOptions {
  accounts: Accounts
  retries: number
}

export const createCodex = ({ accounts, retries }: CodexOptions) => ({
  async *stream(account: string, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const credential = await accounts.auth(account)
    const id = request.model ?? codexModels[0]!
    const payload = codexBody(request, id)
    const { url, headers } = codexTarget(credential, payload.prompt_cache_key)
    const name = accounts.label(account)
    const response = await reaching(url, name, signal, () => send(url, { method: 'POST', headers, body: JSON.stringify(payload) }, { retries, signal }))
    if (!response.body) throw new Error('Empty response body')
    yield* readCodex(frames(response.body), id)
  },
})
