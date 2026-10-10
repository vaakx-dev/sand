export interface CompatTarget {
  base: string
  key?: string
  model: string
  name: string
  reasoning?: boolean
  images?: boolean
}

const isOpenRouter = (base: string) => {
  try {
    const host = new URL(base).hostname
    return host === 'openrouter.ai' || host.endsWith('.openrouter.ai')
  } catch {
    return false
  }
}

const openRouterHeaders = { 'HTTP-Referer': 'https://github.com/vaakx-dev/sand', 'X-Title': 'sand' }

export const compatUrl = (target: CompatTarget) => `${target.base.replace(/\/+$/, '')}/chat/completions`

export const compatHeaders = (target: CompatTarget): Record<string, string> => ({
  accept: 'text/event-stream',
  'content-type': 'application/json',
  ...(target.key && { authorization: `Bearer ${target.key}` }),
  ...(isOpenRouter(target.base) && openRouterHeaders),
})
