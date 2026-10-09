import type { LLMRequest } from '../contract'
import { rawMessage } from '../errors'
import { sharePaths } from '../share/info'
import { authHeaders, Offline, Refused, refusal } from './http'
import type { RemotePc } from './remotes'

const answerTimeout = 10_000

export interface OpenOptions {
  connect(pc: RemotePc): Promise<string>
  forget(): void
}

const post = async (url: string, pc: RemotePc, request: LLMRequest, signal?: AbortSignal) => {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, answerTimeout)
  try {
    const response = await fetch(`${url}${sharePaths.stream}`, {
      method: 'POST',
      headers: { ...authHeaders(pc), 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
    if (!response.ok || !response.body) throw new Refused(response.status, await refusal(response))
    return response.body
  } finally {
    clearTimeout(timer)
  }
}

export const openStream = async (pc: RemotePc, request: LLMRequest, signal: AbortSignal | undefined, options: OpenOptions) => {
  for (let attempt = 0; ; attempt++) {
    const url = await options.connect(pc)
    try {
      return await post(url, pc, request, signal)
    } catch (error) {
      if (signal?.aborted || error instanceof Refused) throw error
      options.forget()
      if (attempt) throw new Offline(`${url} · ${rawMessage(error)}`)
    }
  }
}
