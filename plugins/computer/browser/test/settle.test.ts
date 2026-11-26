import { expect, test } from 'bun:test'
import { settle } from '../src/settle'
import type { Call } from '../src/tabs'

const throttledPage: Call = async <T>(method: string) => {
  if (method === 'Page.getFrameTree') return { frameTree: { frame: { id: 'main' } } } as T
  if (method === 'Page.createIsolatedWorld') return { executionContextId: 1 } as T
  return new Promise<T>(() => {})
}

test('settles within its budget when the page never answers a paint probe', async () => {
  const started = performance.now()
  await settle({ current: async () => throttledPage, loaded: async () => {} })
  expect(performance.now() - started).toBeLessThan(4_000)
})
