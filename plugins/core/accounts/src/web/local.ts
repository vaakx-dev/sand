import { settingMark } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { LoginState } from '../contract'
import type { RowActions } from './account-menu'
import { entriesOf, listed, planRow, type PlanSheets, pooledRemote } from './plan'
import { accountRow, type Rows } from './row'
import type { LoginControl } from './state'

interface LocalParts {
  control: LoginControl
  actions: RowActions
  plans: PlanSheets
  add(): void
}

const entries = (rows: Rows, state: LoginState, plans: PlanSheets) =>
  entriesOf(state).map(entry => (entry.kind === 'plan' ? planRow(rows.kit, entry.plan, plans.open) : accountRow(rows, entry.account)))

export const localSection = (kit: Kit, { control, actions, plans, add }: LocalParts) => {
  const { contextMenu, emptyState, icon, loadingState, secondaryAction, settingsSection } = kit
  const menu = contextMenu()
  const rows = { kit, control, actions, menu }
  return settingsSection(
    { action: secondaryAction({ ...settingMark('add-account'), size: 'sm', onClick: add }, icon('plus', 'sm'), 'Add an account') },
    menu.view(),
    dynamicChild(
      derive(() => {
        const state = control.state.get()
        return JSON.stringify(state ? [listed(state), pooledRemote(state)] : null)
      }),
      () => {
        const state = control.state.get()
        if (!state) return loadingState()
        const shown = entries(rows, state, plans)
        return shown.length ? div({ class: 'contents' }, shown) : emptyState({ text: 'No accounts on this PC yet.' })
      },
    ),
  )
}
