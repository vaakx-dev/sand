import { z } from 'zod'
import { count } from './fields'
import { getJson } from './http'

const versionSchema = z.object({ version: z.string() })

const showSchema = z.object({ model_info: z.record(z.string(), z.unknown()) })

const concurrency = 10
const probe = 1_500

export const isOllama = async (root: string) => {
  if (new URL(root).port === '11434') return true
  try {
    const body = await getJson('Ollama', `${root}/api/version`, {}, probe)
    return versionSchema.safeParse(body).success
  } catch {
    return false
  }
}

const contextOf = async (root: string, model: string) => {
  try {
    const response = await fetch(`${root}/api/show`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model }),
      signal: AbortSignal.timeout(probe * 2),
    })
    if (!response.ok) return undefined
    const body: unknown = await response.json()
    const info = showSchema.safeParse(body).data?.model_info ?? {}
    const key = Object.keys(info).find(name => name.endsWith('.context_length'))
    return count.parse(key ? info[key] : undefined)
  } catch {
    return undefined
  }
}

export const contexts = async (root: string, names: string[]) => {
  const found = new Map<string, number>()
  let next = 0
  const worker = async () => {
    while (next < names.length) {
      const name = names[next++]!
      const context = await contextOf(root, name)
      if (context) found.set(name, context)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker))
  return found
}
