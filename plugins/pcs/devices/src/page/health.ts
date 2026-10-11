import { badge, div, dynamicChild, p, quietButton, secondaryAction, span, type Tone } from '@sand/dom'
import { healthDetails } from '../health/details'
import type { PcHealthState, PcHealthStatus, PcHealthStore } from '../health/state'

export interface HealthTarget {
  id: string
  name: string
  local: boolean
  online: boolean
}

const badges: Record<PcHealthStatus, [Tone, string]> = {
  checking: ['neutral', 'Checking…'],
  healthy: ['success', 'Healthy'],
  problem: ['danger', 'Problem'],
  unknown: ['warning', "Can't check"],
  repairing: ['accent', 'Repairing…'],
}

const report = (state: PcHealthState) =>
  div(
    { class: 'flex flex-col gap-3' },
    div({ class: 'flex' }, badge(...badges[state.status])),
    state.health ? healthDetails(state.health) : null,
    state.error ? p({ class: 'text-xs whitespace-pre-wrap wrap-anywhere text-warning-400' }, state.error) : null,
  )

export const healthPanel = (target: HealthTarget, health: PcHealthStore) => {
  const state = health.state(target.id, target.local, target.online)
  const busy = () => ['checking', 'repairing'].includes(state.get().status)
  const repair = target.local
    ? []
    : [
        secondaryAction({ size: 'sm', disabled: busy, onClick: () => void health.repair(target.id, target.name) }, 'Repair'),
        span({ class: 'text-xs text-neutral-500' }, `Repair reinstalls the latest sand from GitHub on ${target.name}.`),
      ]
  return div(
    { class: 'flex flex-col gap-3 px-4 pb-3' },
    dynamicChild(state, report),
    div(
      { class: 'flex flex-wrap items-center gap-3' },
      quietButton({ size: 'sm', disabled: busy, onClick: () => health.refresh(target.id, target.local) }, 'Check again'),
      ...repair,
    ),
  )
}
