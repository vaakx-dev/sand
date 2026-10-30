import { connectionPing, isPcUnavailable } from '@sand/devices-contract'
import { isTimeout } from '../errors/timed-out'
import type { Link } from '../link/link'
import { timer } from '../time/timer'
import { pingTimeout, quietAfter } from '../timing'

export interface HealthTarget {
  current(): Link | undefined
  visible(): boolean
  measured(link: Link, latency: number): void
  failed(link: Link, error: unknown): void
}

const unanswered = (error: unknown) => isTimeout(error) || isPcUnavailable(error)

export const healthWatch = (target: HealthTarget) => {
  const checkTimer = timer()
  let pinging: Link | undefined

  const ping = async (link: Link) => {
    if (pinging === link) return
    pinging = link
    const started = Date.now()
    try {
      await link.call(connectionPing, {}, pingTimeout(link.route))
      target.measured(link, Date.now() - started)
    } catch (error) {
      if (unanswered(error)) return target.failed(link, error)
      target.measured(link, Date.now() - started)
    } finally {
      if (pinging === link) pinging = undefined
    }
    check()
  }

  const check = () => {
    checkTimer.clear()
    const link = target.current()
    if (!link) return
    const quiet = Date.now() - link.heard()
    if (quiet < quietAfter) return checkTimer.set(quietAfter - quiet, check)
    if (!target.visible()) return checkTimer.set(quietAfter, check)
    void ping(link)
  }

  return {
    watch: check,
    now() {
      const link = target.current()
      if (link) void ping(link)
    },
    stop: () => checkTimer.clear(),
  }
}
