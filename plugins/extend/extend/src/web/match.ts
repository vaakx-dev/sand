import type { Context, ScopeView, Services } from 'drydock'
import { resolve, sep } from 'node:path'

export type WebState = ReturnType<Services['webExtensions']['list']>[number]

const normal = (path: string) => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))

const inside = (dir: string, parent: string) => {
  const child = normal(dir)
  const root = normal(parent)
  return child === root || child.startsWith(root + sep)
}

export const webStates = (ctx: Context): WebState[] => ctx.webExtensions?.list() ?? []

export const webOf = (scope: ScopeView, states: WebState[]) => {
  const dir = scope.source?.dir
  const byDir = dir ? states.filter(state => inside(dir, state.dir)).sort((a, b) => b.dir.length - a.dir.length)[0] : undefined
  return byDir ?? states.find(state => state.id === scope.name)
}

export const webOnly = (scopes: ScopeView[], states: WebState[]) => {
  const owned = new Set(scopes.map(scope => webOf(scope, states)))
  return states.filter(state => !owned.has(state))
}
