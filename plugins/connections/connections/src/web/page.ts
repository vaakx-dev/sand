import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Account, ConnectionState, KindInfo } from '../contract'
import { connectPanel } from './connect'
import type { ConnectionsModel } from './model'

const detailOf = (account: Account, kinds: KindInfo[]) => {
  const kind = kinds.find(item => item.id === account.kind)?.label ?? account.kind
  if (account.problem) return `${kind} · ${account.problem}`
  return account.readOnly ? `${kind} · Read only` : kind
}

const accountRow = (kit: Kit, model: ConnectionsModel, account: Sig<Account>) => {
  const { primaryAction, secondaryAction, settingsRow, toneText } = kit
  return settingsRow(
    {
      title: account.map(value => value.name),
      detail: span({ class: () => (account.get().problem ? toneText.danger : undefined) }, () => detailOf(account.get(), model.state.get()?.kinds ?? [])),
    },
    show(
      () => !!account.get().problem,
      () => primaryAction({ size: 'sm', onClick: () => model.reconnect(account.get()) }, 'Reconnect'),
    ),
    secondaryAction({ size: 'sm', disabled: () => model.busy.get(), onClick: () => void model.remove(account.get().id) }, 'Disconnect'),
  )
}

const kindRow = (kit: Kit, model: ConnectionsModel, kind: Sig<KindInfo>) => {
  const { rowDetail, secondaryAction, settingsRow } = kit
  const opened = () => model.open.get() === kind.get().id
  return div(
    { class: 'contents' },
    settingsRow(
      { title: kind.map(value => value.label) },
      show(
        () => !opened(),
        () => secondaryAction({ size: 'sm', onClick: () => model.choose(kind.get().id) }, 'Connect'),
      ),
    ),
    show(opened, () =>
      rowDetail(
        dynamicChild(
          kind.map(value => `${value.method}:${value.client}`),
          () => connectPanel(kit, model, kind.get()),
        ),
      ),
    ),
  )
}

const content = (kit: Kit, model: ConnectionsModel, state: Sig<ConnectionState | undefined>) => {
  const { emptyState, errorText, rowList, settingsSection, sheetText } = kit
  const accounts = state.map(value => value?.accounts ?? [])
  const kinds = state.map(value => (value?.kinds ?? []).toSorted((a, b) => a.label.localeCompare(b.label)))
  return div(
    { class: 'contents' },
    show(
      () => accounts.get().length > 0,
      () => settingsSection({ title: 'Accounts' }, rowList(accounts, account => account.id, account => accountRow(kit, model, account))),
    ),
    show(
      () => !model.open.get() && !!model.error.get(),
      () => errorText(() => model.error.get()),
    ),
    dynamicChild(
      kinds.map(list => list.length > 0),
      any =>
        any
          ? settingsSection({ title: 'Connect' }, rowList(kinds, kind => kind.id, kind => kindRow(kit, model, kind)))
          : emptyState({ text: 'No plugin offers connections yet.' }),
    ),
    sheetText(() =>
      state.get()?.keychain ? 'Kept encrypted, with the key in the system keychain.' : 'Kept encrypted, with the key in connections.key in the sand home.',
    ),
  )
}

export const connectionsPage = (kit: Kit, model: ConnectionsModel) =>
  div(
    { class: 'flex flex-col gap-6' },
    kit.pageHead('Accounts at other services that plugins like Calendar use. Agents work through them without ever seeing a password or token.'),
    dynamicChild(
      model.state.map(value => value === undefined),
      loading => (loading ? kit.loadingState() : content(kit, model, model.state)),
    ),
  )
