import type { Kit, Tone } from '@sand/ui-kit/contract'
import { div, dynamicChild, span } from '@vaakx-dev/vrui'
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

const report = (kit: Kit, state: PcHealthState) => {
  const { badge, errorText } = kit
  return div(
    { class: 'flex flex-col gap-3' },
    div({ class: 'flex' }, badge(...badges[state.status])),
    state.health ? healthDetails(kit, state.health) : null,
    state.error ? errorText(state.error) : null,
  )
}

export const healthPanel = (kit: Kit, target: HealthTarget, health: PcHealthStore) => {
  const { secondaryAction } = kit
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
    dynamicChild(state, current => report(kit, current)),
    div(
      { class: 'flex flex-wrap items-center gap-3' },
      secondaryAction({ size: 'sm', disabled: busy, onClick: () => health.refresh(target.id, target.local) }, 'Check now'),
      ...repair,
    ),
  )
}
