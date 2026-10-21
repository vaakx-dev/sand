import { errorMessage } from '@sand/util'
import type { OrrinSetup, OrrinStep } from '../contract'
import { binaryVersion, findBinary } from './binary'
import { liveDaemon, startDaemon, stopDaemon, type LiveDaemon } from './daemon'
import { placeBinary } from './place'
import { downloadArchive, verifyArchive } from './release/download'
import { fetchLatest, type OrrinRelease } from './release/latest'
import { unpackBinary } from './release/unpack'

interface SetupOptions {
  home: string
  port?: number
  releases: string
  changed(setup: OrrinSetup): void
  started(): void
}

const latestMaxAge = 60 * 60_000

const newer = (version: string, than: string) => Bun.semver.order(version, than) === 1

export const createSetup = ({ home, port, releases, changed, started }: SetupOptions) => {
  let installed: OrrinSetup['installed']
  let running: LiveDaemon | undefined
  let latest: OrrinRelease | undefined
  let checkedAt = 0
  let task: OrrinSetup['task']
  let error: string | undefined
  let checkError: string | undefined

  const snapshot = (): OrrinSetup => ({
    installed,
    running: running && { version: running.version, port: running.port, projects: running.projects },
    latest: latest?.version,
    updateAvailable: !!latest && !!installed && newer(latest.version, installed.version),
    restartNeeded: !!running && !!installed && newer(installed.version, running.version),
    task,
    error: error ?? checkError,
  })

  const emit = () => changed(snapshot())

  const step = (next: OrrinStep, percent?: number) => {
    if (task?.step === next && task.percent === percent) return
    task = { step: next, ...(percent !== undefined && { percent }) }
    emit()
  }

  const remember = (failure: unknown) => {
    error = errorMessage(failure)
  }

  const readInstalled = async () => {
    const path = await findBinary(home)
    installed = path ? { path, version: await binaryVersion(path) } : undefined
  }

  const readLatest = async (force = false) => {
    if (!force && Date.now() - checkedAt < latestMaxAge) return latest
    latest = await fetchLatest(releases)
    checkedAt = Date.now()
    return latest
  }

  const refresh = async () => {
    const failures: unknown[] = []
    const noted = (failure: unknown) => void failures.push(failure)
    await Promise.all([
      readInstalled().catch(noted),
      readLatest().catch(noted),
      liveDaemon(home).then(found => void (running = found), noted),
    ])
    checkError = failures.length ? errorMessage(failures[0]) : undefined
    emit()
    return snapshot()
  }

  const run = (work: () => Promise<void>) => {
    if (task) return snapshot()
    error = undefined
    void work()
      .catch(remember)
      .finally(() => {
        task = undefined
        void refresh()
      })
    return snapshot()
  }

  const startInstalled = async () => {
    step('starting')
    const binary = await findBinary(home)
    if (!binary) throw new Error('Orrin is not installed')
    await startDaemon(home, binary, port)
    started()
  }

  const install = () =>
    run(async () => {
      step('downloading', 0)
      const release = await readLatest(true)
      if (!release) throw new Error('There is no Orrin release yet')
      if (!release.archive) throw new Error(`Orrin ${release.version} has no build for this PC`)
      const bytes = await downloadArchive(release.archive, percent => step('downloading', percent))
      step('verifying')
      await verifyArchive(release, bytes)
      step('unpacking')
      await placeBinary(home, await unpackBinary(release.archive.name, bytes))
      if (!(await liveDaemon(home))) await startInstalled()
    })

  const start = () => run(startInstalled)

  const autostart = async () => {
    await refresh()
    if (installed && !running) start()
  }

  const restart = () =>
    run(async () => {
      const live = await liveDaemon(home)
      if (live) {
        step('stopping')
        await stopDaemon(home, live.pid)
      }
      await startInstalled()
    })

  return { refresh, install, start, restart, autostart }
}
