import type { BuildInfo } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { healthText, type GithubRelease, type HealthOutcome } from '@sand/kit/host'
import { basename } from 'node:path'
import type { UpdatePhase } from '../contract'
import type { PreparedBuild, UpdaterDeps } from '../types'

export interface InstallProgress {
  step(next: UpdatePhase, ticket: number): void
  live(ticket: number): boolean
  fail(message: string): void
  done(build: BuildInfo): void
  currentId(): string | undefined
}

const drainPoll = 2_000
const restartDelay = 300

export const cancelled = new Error('cancelled')

const short = (id: string | undefined) => (id ?? 'unknown').slice(0, 6)

export const createInstaller = (deps: UpdaterDeps, progress: InstallProgress) => {
  const ensureLive = (ticket: number) => {
    if (!progress.live(ticket)) throw cancelled
  }

  const idle = () =>
    deps.runtimes.live().every(runtime => !runtime.activity.sessions.length && !runtime.activity.jobs.length)

  const drain = async (ticket: number) => {
    const until = Date.now() + deps.drainTimeout
    while (!idle() && Date.now() < until) {
      await Bun.sleep(Math.max(0, Math.min(drainPoll, until - Date.now())))
      ensureLive(ticket)
    }
  }

  const cleanup = (keep: string[]) =>
    deps.cleanup(keep).catch(failure => console.error(`sand could not remove old builds: ${errorMessage(failure)}`))

  const goBack = async (before: string) => {
    deps.app.use(before)
    await deps.restorePrevious()
  }

  const unhealthy = async (prepared: PreparedBuild, before: string, previous: string, outcome: HealthOutcome) => {
    const text = healthText(outcome)
    console.error(`build ${short(prepared.build.id)} was not healthy:\n${text}`)
    await goBack(before)
    const back = await deps.runtimes.swap('update')
    if (!back) console.error('the previous sand runtime did not start again either')
    const reason = text.split('\n')[0] || 'no details'
    progress.fail(`build ${short(prepared.build.id)} was not healthy, so this PC went back to build ${short(previous)}: ${reason}`)
  }

  const swapRuntime = async (prepared: PreparedBuild, ticket: number) => {
    const before = deps.app.root()
    const previous = progress.currentId() ?? basename(before)
    deps.app.use(prepared.root)
    const ok = await deps.runtimes.swap('update')
    ensureLive(ticket)
    if (!ok) {
      await goBack(before)
      progress.fail(`the new sand runtime did not start; this PC stays on build ${short(previous)}`)
      return
    }
    const outcome = await deps.health()
    ensureLive(ticket)
    if (!outcome.ok) return await unhealthy(prepared, before, previous, outcome)
    const build = await deps.current().catch(() => prepared.build)
    ensureLive(ticket)
    progress.done(build)
    void cleanup([prepared.root, deps.hostRoot])
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
      if (!changed) return await swapRuntime(prepared, ticket)
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

  return { install, cleanup }
}
