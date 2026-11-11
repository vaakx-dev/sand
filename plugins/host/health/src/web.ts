import { upstreamUrl } from '@sand/boot'
import type { RuntimeView } from '@sand/host-runtimes/contract'
import { errorMessage } from '@sand/util'

interface WebProbe {
  ok: boolean
  error?: string
}

const get = async (runtime: RuntimeView, path: string) => {
  const response = await fetch(upstreamUrl(runtime.url, new URL(path, runtime.url), runtime.secret, false), {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(5000),
  })
  return { status: response.status, body: await response.text() }
}

const scriptOf = (page: string) => page.match(/<script type="module" src="([^"]+)"/)?.[1]

const checkPage = async (runtime: RuntimeView): Promise<string | undefined> => {
  const page = await get(runtime, '/')
  if (page.status !== 200) return `the web page answered ${page.status}`
  const app = scriptOf(page.body)
  if (!app) return 'the web page does not load the app'
  const script = await get(runtime, app)
  if (script.status !== 200) return `the app script answered ${script.status}`
  if (!script.body.trim()) return 'the app script is empty'
}

export const probeWeb = async (runtime: RuntimeView | undefined): Promise<WebProbe> => {
  if (!runtime) return { ok: false, error: 'no runtime is running' }
  try {
    const error = await checkPage(runtime)
    return error ? { ok: false, error } : { ok: true }
  } catch (error) {
    return { ok: false, error: `the runtime did not answer: ${errorMessage(error)}` }
  }
}
