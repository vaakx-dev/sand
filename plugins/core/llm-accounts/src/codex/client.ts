import type { LLMEvent, LLMRequest } from '../contract'
import { labels, subscriptions, type Accounts } from '../auth/accounts'
import { send } from '../http/send'
import { reaching } from '../reach'
import { codexBody } from './body'
import { readCodex } from './reader'
import { frames } from './sse'
import { codexTarget } from './target'

export interface CodexOptions {
  accounts: Accounts
  model: (model?: string) => string
  retries: number
}

export const createCodex = ({ accounts, model, retries }: CodexOptions) => ({
  async *stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const credential = await accounts.auth('openai')
    const id = model(request.model)
    const payload = codexBody(request, id)
    const { url, headers } = codexTarget(credential, payload.prompt_cache_key)
    const name = credential.type === 'oauth' ? subscriptions.openai : labels.openai
    const response = await reaching(url, name, signal, () => send(url, { method: 'POST', headers, body: JSON.stringify(payload) }, { retries, signal }))
    if (!response.body) throw new Error('Empty response body')
    yield* readCodex(frames(response.body), id)
  },
})
