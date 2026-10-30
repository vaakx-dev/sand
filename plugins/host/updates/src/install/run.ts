import type { BuildInfo } from '@sand/host-dist/contract'
import { errorMessage } from '@sand/util'
import { healthText } from '@sand/util/boot'
import type { GithubRelease } from '../github/release'
import { basename } from 'node:path'
import type { UpdatePhase } from '../contract'
import type { PreparedBuild, UpdaterDeps } from '../types'

export interface InstallProgress {
  step(next: UpdatePhase, ticket: number): void
  live(ticket: number): boolean
  fail(message: string): void
  done(build: BuildInfo): void
}

const drainPoll = 2_000
const restartDelay = 300

export const cancelled = new Error('cancelled')

export const runningWork = (deps: Pick<UpdaterDeps, 'runtimes'>) =>
  deps.runtimes.live().reduce((count, runtime) => count + runtime.activity.sessions.length, 0)

const short = (id: string | undefined) => (id ?? 'unknown').slice(0, 6)

export const createInstaller = (deps: UpdaterDeps, progress: InstallProgress) => {
  const ensureLive = (ticket: number) => {
    if (!progress.live(ticket)) throw cancelled
  }

  let rushed = false

  const drain = async (ticket: number) => {
    rushed = false
    const until = Date.now() + deps.drainTimeout
    while (runningWork(deps) && !rushed && Date.now() < until) {
      await Bun.sleep(Math.max(0, Math.min(drainPoll, until - Date.now())))
      ensureLive(ticket)
      progress.step('waiting', ticket)
    }
  }

  const cleanup = (keep: string[]) =>
    deps.cleanup(keep).catch(failure => console.error(`sand could not remove old builds: ${errorMessage(failure)}`))

  const swapBack = async (before: string, swapped: boolean) => {
    deps.app.use(before)
    if (swapped && !(await deps.runtimes.swap('update'))) console.error('the previous sand runtime did not start again either')
  }

  const swapRuntime = async (prepared: PreparedBuild, ticket: number) => {
    const before = deps.app.root()
    deps.app.use(prepared.root)
    const swapped = await deps.runtimes.swap('update')
    ensureLive(ticket)
    const outcome = swapped ? await deps.health() : undefined
    ensureLive(ticket)
    if (outcome?.ok) {
      const build = await deps.current().catch(() => prepared.build)
      ensureLive(ticket)
      progress.done(build)
      void cleanup([prepared.root, deps.hostRoot])
      return true
    }
    const detail = outcome ? `it was not healthy:\n${healthText(outcome)}` : 'it did not start'
    console.error(`this sand could not run build ${short(prepared.build.id)}'s runtime, so it restarts into it instead; ${detail}`)
    await swapBack(before, swapped)
    return false
  }

  const needsRestart = async (prepared: PreparedBuild, force: boolean) =>
    force || prepared.bun !== Bun.version || (await deps.hostChanged(deps.hostRoot, prepared.root))

  const refreshShim = () =>
    deps.refreshShim().catch(failure => console.error(`sand could not update the sand command: ${errorMessage(failure)}`))

  const install = async (release: GithubRelease, ticket: number, force: boolean) => {
    try {
      const bytes = await deps.download(release)
      progress.step('installing', ticket)
      const prepared = await deps.prepare(bytes, force)
      await deps.checkLoads(prepared.root, prepared.bunPath)
      progress.step('switching', ticket)
      const changed = await needsRestart(prepared, force)
      ensureLive(ticket)
      await deps.switchTo(basename(prepared.root))
      await refreshShim()
      if (!changed && (await swapRuntime(prepared, ticket))) return
      progress.step('waiting', ticket)
      await drain(ticket)
      progress.step('restarting', ticket)
      await Bun.sleep(restartDelay)
      ensureLive(ticket)
      deps.restart()
    } catch (failure) {
      if (failure === cancelled) return
      progress.fail(errorMessage(failure))
    }
  }

  const hurry = () => {
    rushed = true
  }

  return { install, cleanup, hurry }
}
