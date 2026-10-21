import { errorMessage, serial } from '@sand/util'
import { findTailscale } from './binary'
import type { HostTailscale, TailscaleState } from './contract'
import { serveOff, serveOn } from './serve'
import { loadSettings, saveSettings, type TailscaleSettings } from './settings'
import { type Detected, detect, sandTarget } from './status'

interface TailscaleOptions {
  home: string
  port: number
  changed(state: TailscaleState): void
}

interface TailscaleService extends HostTailscale {
  resume(): Promise<TailscaleState>
}

export const createTailscale = async ({ home, port, changed }: TailscaleOptions): Promise<TailscaleService> => {
  const binary = findTailscale()
  const queue = serial()
  let settings: TailscaleSettings = await loadSettings(home)
  let detected: Detected = { installed: Boolean(binary), running: false }
  let failure: string | undefined
  let resumePending = false

  const serving = () => port > 0 && detected.target === sandTarget(port)
  const owned = () => Boolean(detected.target) && (detected.target === sandTarget(port) || detected.target === settings.target)
  const blocked = () => (detected.target && !owned() ? `Port 443 on Tailscale already serves ${detected.target}; sand won't change it` : undefined)

  const build = (): TailscaleState => {
    const on = serving()
    const error = failure ?? detected.error ?? blocked()
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
      failure = `Could not save tailscale.json: ${errorMessage(error)}`
    })
  }

  const turnOn = async () => {
    if (!binary || !detected.running || serving() || blocked()) return
    failure = await serveOn(binary, port)
    if (!failure) await save({ https: settings.https, target: sandTarget(port) })
    detected = await detect(binary)
  }

  const turnOff = async () => {
    if (!binary || !owned()) return
    failure = await serveOff(binary)
    if (!failure) await save({ https: settings.https })
    detected = await detect(binary)
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
      detected = await detect(binary)
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
      detected = await detect(binary)
      if (on) await turnOn()
      else await turnOff()
      return publish()
    })

  const resume = () => {
    resumePending = true
    return refresh()
  }

  return { state: () => current, refresh, setHttps, resume }
}
