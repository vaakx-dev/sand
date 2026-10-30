import type { NetworkScope } from '@sand/devices-contract'
import { errorMessage, serial } from '@sand/util'
import { loadScope, saveScope } from './settings'

const settleDelay = 200

interface ScopeOptions {
  home: string
  bind(scope: NetworkScope): Promise<void>
  changed(scope: NetworkScope): void
}

const describe = (scope: NetworkScope) => (scope === 'network' ? 'your home network' : 'this PC only')

export const createScope = async ({ home, bind, changed }: ScopeOptions) => {
  const switching = serial()
  let bound: NetworkScope = 'local'
  let timer: Timer | undefined
  let stopped = false

  const tryBind = async (scope: NetworkScope) => {
    try {
      await bind(scope)
      bound = scope
      return true
    } catch (error) {
      console.error(`sand could not open to ${describe(scope)}: ${errorMessage(error)}`)
      return false
    }
  }

  const apply = async (scope: NetworkScope) => {
    if (stopped || scope === bound) return
    if (!(await tryBind(scope))) await saveScope(home, bound).catch(() => {})
    changed(bound)
  }

  const set = async (scope: NetworkScope) => {
    await saveScope(home, scope)
    clearTimeout(timer)
    timer = setTimeout(() => void switching(() => apply(scope)), settleDelay)
    return scope
  }

  const stop = () => {
    stopped = true
    clearTimeout(timer)
  }

  const saved = await loadScope(home)
  if (!(await tryBind(saved)) && saved === 'network') await tryBind('local')

  return { current: () => bound, set, stop }
}

export type Scope = Awaited<ReturnType<typeof createScope>>
