import { errorMessage } from '@sand/util'
import { duckDuckGo } from './duckduckgo'
import { exa } from './exa'
import { Fatal, type Hit, type Provider, type Query } from './hit'

export const providers = (key?: string): Provider[] => [exa(key), duckDuckGo]

export const search = async (chain: Provider[], query: Query, signal: AbortSignal): Promise<Hit[]> => {
  const failures: string[] = []
  for (const { name, find } of chain) {
    try {
      return await find(query, signal)
    } catch (error) {
      if (signal.aborted || error instanceof Fatal) throw error
      failures.push(`${name} failed: ${errorMessage(error)}`)
    }
  }
  throw new Error(`Web search could not run. ${failures.join('; ')}`)
}
