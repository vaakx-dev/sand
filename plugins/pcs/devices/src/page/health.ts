import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import { healthDetails } from '../health/details'
import type { PcHealthState, PcHealthStore } from '../health/state'

export interface HealthTarget {
  id: string
  name: string
  local: boolean
  online: boolean
}

const pendingText: Partial<Record<PcHealthState['status'], string>> = { checking: 'Checking…', repairing: 'Repairing…' }

const report = (kit: Kit, state: PcHealthState) => {
  const { errorText, loadingState } = kit
  const pending = pendingText[state.status]
  return div(
    { class: 'flex flex-col gap-3' },
    pending ? loadingState({ flush: true, text: pending }) : null,
    state.health ? healthDetails(kit, state.health) : null,
    state.error ? errorText(state.error) : null,
  )
}

export const healthPanel = (kit: Kit, target: HealthTarget, health: PcHealthStore) => {
  const { metaLine, rowDetail, secondaryAction } = kit
  const state = health.state(target.id, target.local, target.online)
  const busy = () => ['checking', 'repairing'].includes(state.get().status)
  const repair = target.local
    ? []
    : [
        secondaryAction({ size: 'sm', disabled: busy, onClick: () => void health.repair(target.id, target.name) }, 'Repair'),
        metaLine(`Reinstalls the latest sand from GitHub on ${target.name}`),
      ]
  return rowDetail(
    dynamicChild(state, current => report(kit, current)),
    div(
      { class: 'flex flex-wrap items-center gap-3' },
      secondaryAction({ size: 'sm', disabled: busy, onClick: () => health.refresh(target.id, target.local) }, 'Check now'),
      ...repair,
    ),
  )
}
