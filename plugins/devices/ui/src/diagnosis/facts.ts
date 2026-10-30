import type { Attempt, Diagnosis, PcView, PeerView } from '@sand/devices-contract'
import type { NameOf } from '../status/words'

export interface Facts {
  pc: string
  name: string
  device: string
  home: string
  homeName: string
  view: PcView | undefined
  diagnosis: Diagnosis | undefined
  homeView: PeerView | undefined
  homeError: string | undefined
  homeLan: string | undefined
  nameOf: NameOf
}

export const latestAttempts = (diagnosis: Diagnosis | undefined) => {
  const latest = new Map<string, Attempt>()
  for (const attempt of diagnosis?.attempts ?? []) {
    const known = latest.get(attempt.route.key)
    if (!known || known.at <= attempt.at) latest.set(attempt.route.key, attempt)
  }
  return latest
}

export const homeReaches = (facts: Facts) => facts.pc !== facts.home && facts.homeView?.status.phase === 'connected'

export const tried = (facts: Facts, result: Attempt['result']) => [...latestAttempts(facts.diagnosis).values()].some(attempt => attempt.result === result)
