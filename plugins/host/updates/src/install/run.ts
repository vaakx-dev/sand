import { healthText } from '@sand/boot'
import { olderThanData } from '@sand/ledger/contract'
import { errorMessage } from '@sand/util'
import type { BuildInfo } from '@sand/util/release'
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

const restartDelay = 300

export const cancelled = new Error('cancelled')

export const runningWork = (deps: Pick<UpdaterDeps, 'runtimes'>) =>
  deps.runtimes.live().reduce((count, runtime) => count + runtime.activity.sessions.length, 0)

const short = (id: string | undefined) => (id ?? 'unknown').slice(0, 6)

export const createInstaller = (deps: UpdaterDeps, progress: InstallProgress) => {
  const ensureLive = (ticket: number) => {
    if (!progress.live(ticket)) throw cancelled
  }

  const handOver = () => Promise.race([deps.runtimes.retire(), Bun.sleep(deps.drainTimeout)])

  const cleanup = (keep: string[]) =>
    deps.cleanup(keep).catch(failure => console.error(`sand could not remove old builds: ${errorMessage(failure)}`))

  const swapBack = async (before: string, swapped: boolean, running: BuildInfo) => {
    const blocked = olderThanData(running, deps.upgrade())
    if (blocked) return console.error(`the new sand runtime stays until the restart, because the previous ${blocked}`)
    deps.app.use(before)
    if (swapped && !(await deps.runtimes.swap('update'))) console.error('the previous sand runtime did not start again either')
  }

  const swapRuntime = async (prepared: PreparedBuild, ticket: number, running: BuildInfo) => {
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
    await swapBack(before, swapped, running)
    return false
  }

  const needsRestart = async (prepared: PreparedBuild, force: boolean) =>
    force || prepared.bun !== Bun.version || (await deps.hostChanged(deps.hostRoot, prepared.root))

  const refreshShim = () =>
    deps.refreshShim().catch(failure => console.error(`sand could not update the sand command: ${errorMessage(failure)}`))

  const refuseOlder = (release: GithubRelease) => {
    const problem = olderThanData(release.build, deps.upgrade())
    if (problem) throw new Error(`sand did not install it: ${problem}. Wait for a newer build on this channel, or switch to the channel you came from`)
  }

  const stageAddons = (release: GithubRelease) => deps.addons()?.stage({ addons: release.build.addons, catalog: release.catalogUrl })

  const switchBuild = async (prepared: PreparedBuild, release: GithubRelease, ticket: number) => {
    const addons = await stageAddons(release)
    try {
      progress.step('switching', ticket)
      ensureLive(ticket)
      await deps.switchTo(basename(prepared.root))
    } catch (error) {
      await addons?.drop()
      throw error
    }
    await addons?.place()
    await refreshShim()
  }

  const install = async (release: GithubRelease, ticket: number, force: boolean) => {
    try {
      refuseOlder(release)
      const running = await deps.current()
      const bytes = await deps.download(release)
      progress.step('installing', ticket)
      const prepared = await deps.prepare(bytes, force)
      await deps.checkLoads(prepared.root, prepared.bunPath)
      const changed = await needsRestart(prepared, force)
      await switchBuild(prepared, release, ticket)
      if (!changed && (await swapRuntime(prepared, ticket, running))) return
      progress.step('waiting', ticket)
      await handOver()
      progress.step('restarting', ticket)
      await Bun.sleep(restartDelay)
      deps.restart()
    } catch (failure) {
      if (failure === cancelled) return
      progress.fail(errorMessage(failure))
    }
  }

  return { install, cleanup }
}
