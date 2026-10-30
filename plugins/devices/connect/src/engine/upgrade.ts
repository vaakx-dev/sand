import type { Route } from '@sand/devices-contract'
import type { DialRun } from '../dial/context'
import type { DialOutcome } from '../dial/dial'
import type { Opened } from '../dial/open'
import { timer } from '../time/timer'
import { upgradeEvery } from '../timing'
import type { Active } from './active'

export interface UpgradeHost {
  current(): Active | undefined
  candidates(): Route[]
  usable(route: Route): boolean
  dial(routes: Route[], run: DialRun): Promise<DialOutcome>
  adopt(opened: Opened): void
  lose(cause: string): void
}

export const upgrader = (host: UpgradeHost) => {
  const upgradeTimer = timer()
  let running: DialRun | undefined

  const better = (current: Route) => {
    const routes = host.candidates()
    const index = routes.findIndex(route => route.key === current.key)
    return index < 0 ? routes : routes.slice(0, index)
  }

  const plan = () => {
    upgradeTimer.clear()
    const active = host.current()
    if (active && better(active.opened.route).length) upgradeTimer.set(upgradeEvery, () => void run())
  }

  let again = false

  const run = async () => {
    if (running) {
      again = true
      return
    }
    await upgradeOnce()
    if (!again) return
    again = false
    await run()
  }

  const upgradeOnce = async () => {
    const active = host.current()
    if (!active) return
    const { route } = active.opened
    const leaving = !host.usable(route)
    const routes = better(route)
    if (!routes.length) return leaving ? host.lose('its route was turned off') : undefined
    const dialRun: DialRun = { stopped: false }
    running = dialRun
    const outcome = await host.dial(routes, dialRun)
    const still = running === dialRun && host.current() === active
    if (running === dialRun) running = undefined
    if (!still) {
      if (outcome.ok) outcome.opened.link.close()
      return
    }
    if (outcome.ok) return host.adopt(outcome.opened)
    if (leaving) return host.lose(outcome.cause)
    plan()
  }

  const stop = () => {
    upgradeTimer.clear()
    if (running) running.stopped = true
    running = undefined
    again = false
  }

  return { plan, run, stop }
}
