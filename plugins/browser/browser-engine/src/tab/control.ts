import type { AgentAction, Driver, Point } from '../contract'

const userHoldMs = 60_000

export const userHasControl = 'The user took control of the browser. Stop here and report what you did so far; the user can hand it back.'

export const createControl = (changed: () => void) => {
  let driver: Driver = 'agent'
  let userAt = 0
  let acting = 0
  let action: AgentAction | undefined

  const hand = (next: Driver) => {
    driver = next
    if (next === 'user') userAt = Date.now()
    changed()
  }

  const touched = () => {
    userAt = Date.now()
    if (driver === 'user') return
    driver = 'user'
    changed()
  }

  const claim = () => {
    if (driver === 'agent') return
    if (Date.now() - userAt < userHoldMs) throw new Error(userHasControl)
    driver = 'agent'
  }

  const act = async <T>(verb: string, target: string, work: () => Promise<T>) => {
    claim()
    acting++
    action = { verb, target, at: Date.now() }
    changed()
    try {
      return await work()
    } finally {
      acting--
      changed()
    }
  }

  const point = (at: Point) => {
    if (!action) return
    action = { ...action, point: at, at: Date.now() }
    changed()
  }

  return {
    state: () => ({ driver, acting: acting > 0, ...(action && { action }) }),
    hand,
    touched,
    act,
    point,
  }
}

export type Control = ReturnType<typeof createControl>
