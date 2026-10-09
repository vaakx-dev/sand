import type { FailedPlugin, RuntimeMessage } from '@sand/protocol'
import { terminate } from './kill'
import { spawnRuntime, type Child } from './spawn'

const readyTimeout = 60_000

export type Launched = { child: Child } | { error: string; failed?: FailedPlugin[] }

const listFailed = (failed: FailedPlugin[]) => failed.map(plugin => `${plugin.id}: ${plugin.error}`).join('; ')

export const createLauncher = (main: () => string, receive: (child: Child, message: RuntimeMessage) => void) => {
  const pending = new Map<Child, (result: Launched) => void>()
  const children = new Set<Child>()

  const launch = () =>
    new Promise<Launched>(resolve => {
      const child = spawnRuntime(main(), receive)
      children.add(child)
      const timer = setTimeout(
        () => settle({ error: `the runtime was not ready after ${readyTimeout / 1000} s; see server.log` }),
        readyTimeout,
      )
      const settle = (result: Launched) => {
        if (!pending.has(child)) return
        clearTimeout(timer)
        pending.delete(child)
        if ('error' in result) terminate(child.proc)
        resolve(result)
      }
      pending.set(child, settle)
      void child.proc.exited.then(code => {
        children.delete(child)
        settle({ error: `the runtime exited with code ${code} before it was ready; see server.log` })
      })
    })

  const failedResult = (failed: FailedPlugin[]): Launched => ({
    error: failed.length ? `the runtime could not start because some plugins did not load: ${listFailed(failed)}` : 'the runtime could not start its server; see server.log',
    failed,
  })

  const failed = (child: Child, plugins: FailedPlugin[]) => {
    child.failed = plugins
    pending.get(child)?.(failedResult(plugins))
  }

  const ready = (child: Child, url: string) => {
    const settle = pending.get(child)
    if (!settle) return
    child.url = url
    settle({ child })
  }

  const procs = () => [...children].map(child => child.proc)

  return { launch, ready, failed, procs }
}
