import type { Tailscale, TailscaleState } from '@sand/devices-contract'
import { errorMessage, serial } from '@sand/util'
import { findTailscale } from './binary'
import { type Detected, detect } from './detect'
import { tailscaleErrors } from './errors'
import { readPeers } from './peers'
import { sandTarget, serveOff, serveOn } from './serve'
import { loadSettings, saveSettings, type TailscaleSettings } from './settings'

interface TailscaleOptions {
  home: string
  port: number
  changed(state: TailscaleState): void
}

export interface TailscaleRunner extends Tailscale {
  resume(): Promise<TailscaleState>
}

export const createTailscale = async ({ home, port, changed }: TailscaleOptions): Promise<TailscaleRunner> => {
  const binary = findTailscale()
  const queue = serial()
  let settings: TailscaleSettings = await loadSettings(home)
  let detected: Detected = { installed: Boolean(binary), running: false }
  let checked = false
  let failure: string | undefined
  let resumePending = false

  const serving = () => port > 0 && detected.target === sandTarget(port)
  const owned = () => Boolean(detected.target) && (detected.target === sandTarget(port) || detected.target === settings.target)
  const occupied = () => (detected.target && !owned() ? tailscaleErrors.occupied(detected.target) : undefined)

  const stuck = () => {
    if (!checked || !settings.https || serving()) return undefined
    if (!detected.installed) return tailscaleErrors.notInstalled
    if (!detected.running) return tailscaleErrors.notRunning
    return port ? undefined : tailscaleErrors.fixedPort
  }

  const build = (): TailscaleState => {
    const on = serving()
    const error = failure ?? detected.error ?? occupied() ?? stuck()
    return {
      installed: detected.installed,
      running: detected.running,
      ...(detected.name ? { name: detected.name } : {}),
      ...(detected.ip ? { ip: detected.ip } : {}),
      https: settings.https,
      serving: on,
      ...(on && detected.name ? { httpsUrl: `https://${detected.name}` } : {}),
      ...(error ? { error } : {}),
    }
  }

  let current = build()

  const publish = () => {
    if (serving() === settings.https) failure = undefined
    const next = build()
    if (JSON.stringify(next) === JSON.stringify(current)) return current
    current = next
    changed(next)
    return next
  }

  const save = async (next: TailscaleSettings) => {
    settings = next
    await saveSettings(home, next).catch(error => {
      failure = tailscaleErrors.saveFailed(errorMessage(error))
    })
  }

  const recheck = async () => {
    detected = await detect(binary)
    checked = true
  }

  const turnOn = async () => {
    if (!binary || !detected.running || !port || serving() || occupied()) return
    failure = await serveOn(binary, port)
    if (!failure) await save({ https: true, target: sandTarget(port) })
    await recheck()
  }

  const turnOff = async () => {
    if (!binary || !owned()) return
    failure = await serveOff(binary)
    if (!failure) await save({ https: false })
    await recheck()
  }

  const enqueue = (task: () => Promise<TailscaleState>) =>
    queue(() =>
      task().catch(error => {
        failure = errorMessage(error)
        return publish()
      }),
    )

  const refresh = () =>
    enqueue(async () => {
      await recheck()
      if (resumePending && detected.running) {
        resumePending = false
        if (settings.https) await turnOn()
      }
      return publish()
    })

  const setHttps = (on: boolean) =>
    enqueue(async () => {
      failure = undefined
      resumePending = false
      await save({ ...settings, https: on })
      await recheck()
      if (on) await turnOn()
      else await turnOff()
      return publish()
    })

  const resume = () => {
    resumePending = true
    return refresh()
  }

  return { state: () => current, refresh, setHttps, peers: () => readPeers(binary), resume }
}
