import type { Hook } from './bus'

const precedes = (a: Hook, b: Hook) => a.before.includes(b.scope.name) || b.after.includes(a.scope.name)

const next = (remaining: Hook[]) => {
  const visited = new Set<Hook>()
  let candidate = remaining[0]!
  while (!visited.has(candidate)) {
    visited.add(candidate)
    const blocker = remaining.find(other => other !== candidate && precedes(other, candidate))
    if (!blocker) break
    candidate = blocker
  }
  return candidate
}

export const order = (hooks: Hook[]) => {
  const remaining = [...hooks].sort((a, b) => b.priority - a.priority)
  const ordered: Hook[] = []
  while (remaining.length) {
    const hook = next(remaining)
    remaining.splice(remaining.indexOf(hook), 1)
    ordered.push(hook)
  }
  return ordered
}
