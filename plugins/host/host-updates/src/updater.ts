import { errorMessage } from '@sand/kit'
import { isInstalled, type GithubRelease, type UpdateStore } from '@sand/kit/host'
import type { BuildInfo } from '@sand/protocol'
import type { UpdateChannel, UpdatePhase, UpdateState } from './contract'
import { cancelled, createInstaller, runningWork } from './install/run'
import { buildOf, isNewer, releaseInfo } from './offer'
import { scheduleChecks } from './schedule'
import type { Updater, UpdaterDeps } from './types'

const staleAfter = 10 * 60_000
const busyPhases: UpdatePhase[] = ['downloading', 'installing', 'switching', 'waiting', 'restarting']
const sourceFolder = 'this PC runs sand from a source folder; it does not update itself'

export const createUpdater = (deps: UpdaterDeps, store: UpdateStore): Updater => {
  const installed = isInstalled(deps.app.root(), deps.home)
  let current: BuildInfo | undefined
  let latest: GithubRelease | undefined
  let phase: UpdatePhase = 'idle'
  let error: string | undefined
  let checkError: string | undefined
  let checkedAt: number | undefined
  let checking: Promise<void> | undefined
  let epoch = 0
  let claiming = false
  let sent = ''
  let stopSchedule: (() => void) | undefined

  const available = () => !!latest && !!current && isNewer(latest.build, current)

  const snapshot = (): UpdateState => ({
    installed,
    channel: store.channel(),
    current,
    latest: latest && releaseInfo(latest),
    available: available(),
    later: !!latest && store.hidden(latest.build.id),
    checking: !!checking,
    checkedAt,
    checkError,
    phase,
    error,
    running: runningWork(deps),
  })

  const commit = () => {
    const state = snapshot()
    const text = JSON.stringify(state)
    if (text !== sent) {
      sent = text
      deps.changed(state)
    }
    return state
  }

  const busy = () => busyPhases.includes(phase)

  const settle = (next: UpdatePhase, message?: string) => {
    phase = next
    error = message
    commit()
  }

  const installer = createInstaller(deps, {
    step(next, ticket) {
      if (ticket !== epoch) throw cancelled
      settle(next)
    },
    live: ticket => ticket === epoch,
    fail: message => settle('failed', message),
    done(build) {
      current = build
      settle('idle')
    },
    currentId: () => current?.id,
  })

  const runCheck = async () => {
    const channel = store.channel()
    try {
      current = await deps.current().catch(() => current)
      const release = await deps.find(channel)
      if (channel !== store.channel()) return
      checkError = undefined
      if (busy()) return
      if (phase === 'failed' && latest?.build.id !== release.build.id) settle('idle')
      latest = release
    } catch (failure) {
      if (channel !== store.channel()) return
      checkError = errorMessage(failure)
      console.error(`sand could not check for updates: ${checkError}`)
    } finally {
      if (channel === store.channel()) checkedAt = Date.now()
    }
  }

  const check = (): Promise<UpdateState> => {
    if (!checking) {
      checking = runCheck().finally(() => {
        checking = undefined
      })
      commit()
    }
    return checking.then(commit)
  }

  const setChannel = async (channel: UpdateChannel) => {
    if (channel === store.channel()) return check()
    if (busy() || claiming) throw new Error('sand is updating; change the channel when it is done')
    await store.setChannel(channel)
    latest = undefined
    checkError = undefined
    checkedAt = undefined
    if (phase === 'failed') settle('idle')
    commit()
    await checking
    return check()
  }

  const begin = (release: GithubRelease, force: boolean) => {
    const ticket = ++epoch
    settle('downloading')
    void installer.install(release, ticket, force)
  }

  const claim = async <T>(run: () => Promise<T>) => {
    claiming = true
    try {
      return await run()
    } finally {
      claiming = false
    }
  }

  const stale = () => !checkedAt || Date.now() - checkedAt > staleAfter

  const apply = async (build: string) => {
    if (!installed) throw new Error(sourceFolder)
    if (busy() || claiming) return snapshot()
    return claim(async () => {
      if (latest?.build.id !== build || stale()) await check()
      const release = latest
      if (!release || release.build.id !== build) throw new Error('that build is no longer the newest on GitHub; check again')
      if (release.build.id === current?.id) throw new Error('this PC already runs that build')
      if (busy()) return snapshot()
      begin(release, false)
      return snapshot()
    })
  }

  const repair = async () => {
    if (!installed) throw new Error('this PC runs sand from a source folder; it cannot repair itself')
    if (busy() || claiming) throw new Error('sand is already updating')
    return claim(async () => {
      const release = await deps.find(store.channel())
      if (busy()) throw new Error('sand is already updating')
      latest = release
      checkedAt = Date.now()
      begin(release, true)
      return { ...snapshot(), target: buildOf(release.build) }
    })
  }

  const restartNow = () => {
    if (phase === 'waiting') installer.hurry()
    return snapshot()
  }

  const later = async () => {
    if (latest) await store.hide(latest.build.id)
    if (phase === 'failed') settle('idle')
    return commit()
  }

  return {
    state: snapshot,
    check,
    later,
    setChannel,
    apply,
    restartNow,
    repair,
    start() {
      if (stopSchedule) return
      void deps
        .current()
        .then(build => {
          current ??= build
          commit()
        })
        .catch(() => {})
      const cleanup = installed ? () => void installer.cleanup([deps.app.root(), deps.hostRoot]) : undefined
      stopSchedule = scheduleChecks(() => void check(), cleanup)
    },
    stop() {
      epoch++
      stopSchedule?.()
      stopSchedule = undefined
    },
  }
}
