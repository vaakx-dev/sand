import type { RuntimeView } from '@sand/host-runtimes/contract'
import { errorMessage } from '@sand/kit'
import { upstreamUrl } from '@sand/kit/host'

export interface WebProbe {
  ok: boolean
  error?: string
}

export type Send = (url: URL, init: RequestInit) => Promise<Response>

type Target = Pick<RuntimeView, 'url' | 'secret'>

const get = async (runtime: Target, path: string, send: Send) => {
  const response = await send(upstreamUrl(runtime.url, new URL(path, runtime.url), runtime.secret, false), {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(5000),
  })
  return { status: response.status, body: await response.text() }
}

const checkPage = async (runtime: Target, send: Send): Promise<string | undefined> => {
  const page = await get(runtime, '/', send)
  if (page.status !== 200) return `the web page answered ${page.status}`
  if (!page.body.includes('/app.js')) return 'the web page does not load the app'
  const script = await get(runtime, '/app.js', send)
  if (script.status !== 200) return `the app script answered ${script.status}`
  if (!script.body.trim()) return 'the app script is empty'
}

export const probeWeb = async (runtime: Target | undefined, send: Send = fetch): Promise<WebProbe> => {
  if (!runtime) return { ok: false, error: 'no runtime is running' }
  try {
    const error = await checkPage(runtime, send)
    return error ? { ok: false, error } : { ok: true }
  } catch (error) {
    return { ok: false, error: `the runtime did not answer: ${errorMessage(error)}` }
  }
}
