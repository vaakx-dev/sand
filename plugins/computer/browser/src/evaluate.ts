import type { Call } from './tabs'

interface Evaluated<T> {
  result: { value: T }
  exceptionDetails?: { text: string }
}

interface Script {
  expression: string
  awaitPromise?: boolean
}

const worlds = new WeakMap<Call, Promise<number>>()

const createWorld = async (call: Call) => {
  const { frameTree } = await call<{ frameTree: { frame: { id: string } } }>('Page.getFrameTree')
  const { executionContextId } = await call<{ executionContextId: number }>('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'sand' })
  return executionContextId
}

const worldOf = (call: Call, fresh: boolean) => {
  const known = worlds.get(call)
  if (known && !fresh) return known
  const created = createWorld(call)
  worlds.set(call, created)
  return created
}

export const evaluate = <T>(call: Call, script: Script) => {
  const run = async (fresh: boolean) => call<Evaluated<T>>('Runtime.evaluate', { ...script, contextId: await worldOf(call, fresh), returnByValue: true })
  return run(false).catch(() => run(true))
}
