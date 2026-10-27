import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Connection, ConnectionState } from './contract'

const buttonsKey = (state: ConnectionState) => JSON.stringify(state.actions.map(({ label, primary }) => [label, !!primary]))

const actionButtons = (kit: Kit, state: Sig<ConnectionState>) => {
  const { primaryAction, secondaryAction } = kit
  const press = (label: string) => state.get().actions.find(action => action.label === label)?.run()
  return div(
    { class: 'flex items-center gap-2' },
    state.get().actions.map(({ label, primary }) =>
      (primary ? primaryAction : secondaryAction)({ size: 'sm', disabled: () => !!state.get().busy, onClick: () => press(label) }, label),
    ),
  )
}

const statusText = (kit: Kit, state: Sig<ConnectionState>) => {
  const { dot, spinner } = kit
  return span(
    { class: 'flex min-w-0 items-center gap-2' },
    dynamicChild(
      state.map(current => (current.busy ? undefined : current.tone)),
      tone => (tone ? dot(tone) : spinner()),
    ),
    span({ class: 'truncate' }, () => state.get().status),
  )
}

export const connectionRow = (kit: Kit, connection: Sig<Connection>) => {
  const { errorState, icon, settingsRow } = kit
  const state = derive(() => connection.get().state())
  return div(
    { class: 'contents' },
    settingsRow(
      { lead: icon(connection.get().icon), title: () => connection.get().name, detail: statusText(kit, state) },
      dynamicChild(state.map(buttonsKey), () => actionButtons(kit, state)),
    ),
    show(
      () => !!state.get().error,
      () => errorState({ surface: 'group', text: () => state.get().error ?? '' }),
    ),
  )
}
