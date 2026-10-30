import type { DeviceRecord, InstallProgress, InstallStage, InstallStep } from '@sand/devices-contract'
import { hashSecret } from '@sand/util/fs'

interface Install {
  id: string
  expires: number
  started: boolean
  name?: string
  pc?: string
  last?: InstallProgress
}

type StepDetail = Pick<InstallProgress, 'name' | 'plugins' | 'accounts' | 'error' | 'health'>

const working = 30 * 60_000

const stages: Record<InstallStep, InstallStage> = {
  connected: 'installing',
  sand: 'installing',
  plugins: 'installing',
  pairing: 'joining',
  checking: 'joining',
  sharing: 'sharing',
  ready: 'ready',
  failed: 'failed',
}

export const createInstalls = (report: (progress: InstallProgress) => void) => {
  const installs = new Map<string, Install>()

  const sweep = () => {
    const now = Date.now()
    for (const [hash, install] of installs) if (install.expires <= now) installs.delete(hash)
  }

  const check = (token: string) => {
    sweep()
    return installs.get(hashSecret(token))
  }

  const advance = (install: Install, step: InstallStep, extra: StepDetail = {}) => {
    if (!install.started) {
      install.started = true
      install.expires = Math.max(install.expires, Date.now() + working)
    }
    if (extra.name) install.name = extra.name
    const progress: InstallProgress = {
      install: install.id,
      step,
      stage: stages[step],
      at: Date.now(),
      expires: install.expires,
      ...(install.name && { name: install.name }),
      ...(install.pc && { pc: install.pc }),
      ...extra,
    }
    install.last = progress
    report(progress)
    return install
  }

  const byId = (id: string) => [...installs.values()].find(install => install.id === id)

  return {
    open(id: string, token: string, expires: number) {
      sweep()
      installs.set(hashSecret(token), { id, expires, started: false })
    },
    check,
    step(token: string, step: InstallStep, extra?: StepDetail) {
      const install = check(token)
      return install && advance(install, step, extra)
    },
    paired(id: string, device: DeviceRecord) {
      const install = byId(id)
      if (!install) return
      install.pc = device.id
      advance(install, 'checking', { name: device.name })
    },
    finish(token: string) {
      installs.delete(hashSecret(token))
    },
    cancel(id: string) {
      for (const [hash, install] of installs) if (install.id === id) installs.delete(hash)
    },
    list(): InstallProgress[] {
      sweep()
      return [...installs.values()].flatMap(install => (install.last ? [install.last] : []))
    },
  }
}

export type Installs = ReturnType<typeof createInstalls>
