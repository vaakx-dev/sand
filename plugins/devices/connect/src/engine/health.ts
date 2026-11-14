import { connectionPing, isPcUnavailable } from '@sand/devices-contract'
import { isTimeout } from '../errors/timed-out'
import type { Link } from '../link/link'
import { sleep } from '../time/sleep'
import { timer } from '../time/timer'
import { pingTimeout, quietAfter, wakeGrace } from '../timing'

export interface HealthTarget {
  current(): Link | undefined
  visible(): boolean
  measured(link: Link, latency: number): void
  silent(link: Link): void
  failed(link: Link): void
  changed(): void
}

interface Check {
  link: Link
  since: number
}

const unanswered = (error: unknown) => isTimeout(error) || isPcUnavailable(error)

export const healthWatch = (target: HealthTarget) => {
  const checkTimer = timer()
  let pinging: { link: Link; done: Promise<void> } | undefined
  let checking: Check | undefined

  const settle = (link: Link) => {
    if (pinging?.link === link) pinging = undefined
    if (checking?.link === link) checking = undefined
  }

  const answer = async (link: Link, started: number) => {
    try {
      await link.call(connectionPing, {}, pingTimeout(link.route))
    } catch (error) {
      if (unanswered(error)) {
        settle(link)
        return target.failed(link)
      }
    }
    settle(link)
    target.measured(link, Date.now() - started)
    check()
  }

  const ping = (link: Link) => {
    if (pinging?.link !== link) pinging = { link, done: answer(link, Date.now()) }
    return pinging.done
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

  const confirm = async (wake: Check) => {
    await Promise.race([ping(wake.link), sleep(wakeGrace)])
    if (checking === wake && wake.link.heard() < wake.since) target.silent(wake.link)
  }

  return {
    watch: check,
    wake() {
      const link = target.current()
      if (!link || checking?.link === link) return
      checking = { link, since: Date.now() }
      target.changed()
      void confirm(checking)
    },
    checking: (link: Link) => checking?.link === link,
    stop() {
      checkTimer.clear()
      checking = undefined
    },
  }
}
