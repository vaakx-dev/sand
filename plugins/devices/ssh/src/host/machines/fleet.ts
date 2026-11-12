import type { PeerRoutes } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import { type Answers, createAnswers } from '../askpass/answers'
import { type LinkDeps, openLink } from './link'
import type { Machine } from './store'
import { createSupervisor, type LinkStatus, type OpenLink, type Supervisor } from './supervisor'

export interface FleetDeps extends LinkDeps {
  routes(): PeerRoutes | undefined
  changed(): void
  needsYou(pc: string, error: string): void
}

const idle: LinkStatus = { state: 'connecting' }

const loopback = (port: number) => `http://127.0.0.1:${port}`

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>(resolve => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })

export const createFleet = (deps: FleetDeps) => {
  const { store, secrets } = deps
  const supervisors = new Map<string, Supervisor>()

  const publish = (pc: string, link: OpenLink) => {
    const routes = deps.routes()
    if (!routes) return () => {}
    return joinDisposers(routes.add(pc, loopback(link.lport)), routes.advertise(pc, loopback(link.rport)))
  }

  const open = (pc: string, answers: Answers, signal: AbortSignal) => {
    const machine = store.get(pc)
    if (!machine) return Promise.reject(new Error('That machine was removed'))
    return openLink(deps, machine, answers, signal)
  }

  const supervise = (pc: string) => {
    const found = supervisors.get(pc)
    if (found) return found
    const supervisor = createSupervisor({
      open: (answers, signal) => open(pc, answers, signal),
      background: () => createAnswers({ saved: secrets.of(pc), rejected: text => void secrets.drop(pc, text) }),
      publish: link => publish(pc, link),
      changed: deps.changed,
      needsYou: error => deps.needsYou(pc, error),
      sleep,
      random: Math.random,
      now: Date.now,
    })
    supervisors.set(pc, supervisor)
    return supervisor
  }

  return {
    status: (pc: string) => supervisors.get(pc)?.status() ?? idle,
    start: (pc: string) => void supervise(pc).connect().catch(() => {}),
    connect: (pc: string, answers: Answers, signal: AbortSignal) => supervise(pc).connect(answers, signal),
    async add(machine: Machine, answers: Answers) {
      await store.put(machine)
      await secrets.keep(machine.pc, answers.kept())
    },
    async remove(pc: string) {
      supervisors.get(pc)?.stop()
      supervisors.delete(pc)
      await store.remove(pc)
      await secrets.forget(pc)
    },
    stop() {
      for (const supervisor of supervisors.values()) supervisor.stop()
      supervisors.clear()
    },
  }
}

export type Fleet = ReturnType<typeof createFleet>
