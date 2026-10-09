import type { RouteCaller } from '@sand/protocol'
import type { LoginSharePc } from '../contract'

const quiet = 30_000
const stale = 90_000

export type ShareUsers = ReturnType<typeof createUsers>

export const createUsers = (pcs: Map<string, LoginSharePc>, changed: () => void) => {
  const touch = (caller: RouteCaller, used: boolean) => {
    const now = Date.now()
    const before = pcs.get(caller.device)
    const lastUsed = used ? now : before?.lastUsed
    pcs.set(caller.device, { id: caller.device, name: caller.name, lastSeen: now, ...(lastUsed && { lastUsed }) })
    const fresh = !before || now - before.lastSeen > stale || before.name !== caller.name
    if (fresh || (used && now - (before.lastUsed ?? 0) > quiet)) changed()
  }

  return {
    seen: (caller: RouteCaller) => touch(caller, false),
    used: (caller: RouteCaller) => touch(caller, true),
    list: () => [...pcs.values()].sort((a, b) => b.lastSeen - a.lastSeen),
  }
}
