import { badge, div, dynamicChild, p, quietButton, secondaryAction, span, type Sig, type Tone } from '@sand/dom'
import { healthDetails } from '../health/details'
import type { PcHealthState, PcHealthStore } from '../health/state'

export interface HealthTarget {
  id: string
  name: string
  local: boolean
  online: boolean
}

type HealthStatus = PcHealthState['status']

const badges: Record<HealthStatus, [Tone, string]> = {
  checking: ['neutral', 'Checking…'],
  healthy: ['success', 'Healthy'],
  problem: ['danger', 'Problem'],
  unknown: ['warning', "Can't check"],
  repairing: ['accent', 'Repairing…'],
}

const busy = (status: HealthStatus) => status === 'checking' || status === 'repairing'

const report = (state: PcHealthState) =>
  div(
    { class: 'flex flex-col gap-3' },
    div({ class: 'flex' }, badge(...badges[state.status])),
    state.health ? healthDetails(state.health) : null,
    state.error ? p({ class: 'text-xs whitespace-pre-wrap wrap-anywhere text-warning-400' }, state.error) : null,
  )

export const healthPanel = (target: HealthTarget, health: PcHealthStore) => {
  const state: Sig<PcHealthState> = health.state(target.id, target.local, target.online)
  return div(
    { class: 'flex flex-col gap-3 px-4 pb-3' },
    dynamicChild(state, report),
    div(
      { class: 'flex flex-wrap items-center gap-3' },
      quietButton({ size: 'sm', disabled: () => busy(state.get().status), onClick: () => health.refresh(target.id, target.local) }, 'Check again'),
      target.local
        ? null
        : secondaryAction({ size: 'sm', disabled: () => busy(state.get().status), onClick: () => void health.repair(target.id, target.name) }, 'Repair'),
      target.local ? null : span({ class: 'text-xs text-neutral-500' }, `Repair reinstalls sand on ${target.name} from this PC.`),
    ),
  )
}
