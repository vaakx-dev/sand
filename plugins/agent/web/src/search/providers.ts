import { timeoutMs } from '../http'
import { duckDuckGo } from './duckduckgo'
import { exa } from './exa'
import type { Hit, Provider } from './hit'

export const providers = (key?: string): [Provider, string][] => [
  [exa(key), 'Exa'],
  [duckDuckGo, 'DuckDuckGo'],
]

export const search = async (providers: [Provider, string][], query: string, count: number, signal: AbortSignal): Promise<Hit[]> => {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
  const failures: string[] = []
  for (const [provider, name] of providers) {
    try {
      const hits = await provider(query, count, deadline)
      if (hits.length) return hits
      failures.push(`${name} found nothing`)
    } catch (error) {
      if (signal.aborted) throw error
      if (deadline.aborted) break
      failures.push(`${name} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const reason = deadline.aborted && !signal.aborted ? 'Web search ran out of time.' : 'Web search could not run.'
  throw new Error(failures.length ? `${reason} ${failures.join('; ')}` : reason)
}
