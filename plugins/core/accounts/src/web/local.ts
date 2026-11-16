import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span } from '@vaakx-dev/vrui'
import type { LoginState } from '../contract'
import type { RowActions } from './account-menu'
import { entriesOf, listed, planRow, type PlanSheets } from './plan'
import { accountRow, type Rows, shareable } from './row'
import type { LoginControl } from './state'

interface LocalParts {
  control: LoginControl
  actions: RowActions
  plans: PlanSheets
  add(): void
}

const emptyText = (state: LoginState) =>
  state.remote.length ? 'No accounts on this PC yet. The ones from your PCs below work too.' : 'No accounts on this PC yet. Add one to start using sand.'

const SHARE_NOTE = 'Turn an account’s switch on to share it with your PCs.'

const shareNote = (state: LoginState | undefined) => {
  const shown = state ? listed(state) : []
  return entriesOf(shown).some(entry => entry.kind === 'account' && shareable(entry.account)) ? SHARE_NOTE : ''
}

const entries = (rows: Rows, state: LoginState, plans: PlanSheets) =>
  entriesOf(listed(state)).map(entry => (entry.kind === 'plan' ? planRow(rows.kit, entry, plans.open) : accountRow(rows, entry.account)))

export const localSection = (kit: Kit, { control, actions, plans, add }: LocalParts) => {
  const { contextMenu, emptyState, icon, loadingState, secondaryAction, settingsSection } = kit
  const menu = contextMenu()
  const rows = { kit, control, actions, menu }
  return settingsSection(
    { title: 'On this PC', note: dynamicChild(derive(() => shareNote(control.state.get())), text => span({}, text)), action: secondaryAction({ size: 'sm', onClick: add }, icon('plus', 'sm'), 'Add an account') },
    menu.view(),
    dynamicChild(
      derive(() => {
        const state = control.state.get()
        return JSON.stringify(state ? [listed(state), state.remote.length > 0] : null)
      }),
      () => {
        const state = control.state.get()
        if (!state) return loadingState()
        if (!listed(state).length) return emptyState({ text: emptyText(state) })
        return div({ class: 'contents' }, entries(rows, state, plans))
      },
    ),
  )
}
