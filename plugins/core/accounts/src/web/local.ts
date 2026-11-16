import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, sig, span, stopThen } from '@vaakx-dev/vrui'
import { loginShared, type LoginAccount, type LoginState } from '../contract'
import { accountLogo, howText } from './names'
import { accountSpec, removeAction, type RowActions } from './account-menu'
import { whileBusy } from './parts'
import type { LoginControl } from './state'

const shareSwitch = ({ toggleSwitch }: Kit, account: LoginAccount, control: LoginControl) => {
  const busy = sig(false)
  const toggle = () => whileBusy(busy, () => control.run(loginShared, { account: account.id, shared: !account.shared }))
  return toggleSwitch({ on: account.shared, title: 'Share with my PCs', 'aria-label': `Share ${account.label} with my PCs`, disabled: busy, onClick: () => void toggle() })
}

const serverDetail = ({ dot }: Kit, account: LoginAccount) =>
  span(
    { class: 'flex min-w-0 items-center gap-2' },
    dot(account.error ? 'danger' : 'success'),
    span({ class: 'truncate' }, account.url ?? ''),
    account.error ? span({ class: 'truncate text-danger-400' }, account.error) : null,
  )

const detail = (kit: Kit, account: LoginAccount) => {
  if (account.env) return `API key from ${account.env} · stays on this PC`
  if (account.kind === 'server') return serverDetail(kit, account)
  return [howText(account), account.email].filter(Boolean).join(' · ')
}

const fixLabel = (account: LoginAccount) => {
  if (account.kind === 'server') return 'Edit'
  return account.error ? 'Sign in again' : 'Sign in'
}

const removeButton = ({ confirm, icon, iconButton }: Kit, account: LoginAccount, control: LoginControl) => {
  const action = removeAction(account, control)
  return iconButton({ size: 'sm', title: action.label, 'aria-label': `${action.label}: ${account.label}`, onClick: stopThen((event: MouseEvent) => confirm(event)(action)) }, icon('trash', 'sm'))
}

const renameButton = ({ icon, iconButton }: Kit, account: LoginAccount, { rename }: RowActions) =>
  account.added ? iconButton({ size: 'sm', title: 'Rename', 'aria-label': `Rename ${account.label}`, onClick: () => rename(account) }, icon('pencil', 'sm')) : null

const rowControls = (kit: Kit, account: LoginAccount, control: LoginControl, actions: RowActions) => {
  const { quietButton } = kit
  if (account.env) return []
  const server = account.kind === 'server'
  return [
    server && account.error ? quietButton({ size: 'sm', onClick: () => actions.fix(account) }, 'Edit') : null,
    account.app ? null : shareSwitch(kit, account, control),
    renameButton(kit, account, actions),
    removeButton(kit, account, control),
  ]
}

const signedInRow = (kit: Kit, account: LoginAccount, control: LoginControl, actions: RowActions, menu: ContextMenu) => {
  const { settingsRow } = kit
  const spec = () => accountSpec(account, control, actions)
  return settingsRow(
    { ...menu.target(spec), lead: accountLogo(kit, account.provider), title: account.label, detail: detail(kit, account) },
    ...rowControls(kit, account, control, actions),
    menu.button(spec),
  )
}

const brokenDetail = (account: LoginAccount) => (account.error ? span({ class: 'text-danger-400' }, account.error) : 'Not signed in')

const brokenRow = (kit: Kit, account: LoginAccount, control: LoginControl, actions: RowActions) => {
  const { secondaryAction, settingsRow } = kit
  return settingsRow(
    { lead: accountLogo(kit, account.provider), title: account.label, detail: brokenDetail(account) },
    secondaryAction({ size: 'sm', onClick: () => actions.fix(account) }, fixLabel(account)),
    account.added ? removeButton(kit, account, control) : null,
  )
}

const shown = (state: LoginState) => state.accounts.filter(account => account.signedIn || account.added || (account.error && !account.pending))

const emptyText = (state: LoginState) =>
  state.remote.length ? 'No accounts on this PC yet. The ones from your PCs below work too.' : 'No accounts on this PC yet. Add one to start using sand.'

export const localSection = (kit: Kit, control: LoginControl, add: () => void, actions: RowActions) => {
  const { contextMenu, emptyState, icon, loadingState, secondaryAction, settingsSection } = kit
  const menu = contextMenu()
  return settingsSection(
    { title: 'On this PC', note: 'Turn an account’s switch on to share it with your PCs.', action: secondaryAction({ size: 'sm', onClick: add }, icon('plus', 'sm'), 'Add an account') },
    menu.view(),
    dynamicChild(
      derive(() => {
        const state = control.state.get()
        return JSON.stringify(state ? [shown(state), state.remote.length > 0] : null)
      }),
      () => {
        const state = control.state.get()
        if (!state) return loadingState()
        const list = shown(state)
        if (!list.length) return emptyState({ text: emptyText(state) })
        return div(
          { class: 'contents' },
          list.map(account => (account.signedIn ? signedInRow(kit, account, control, actions, menu) : brokenRow(kit, account, control, actions))),
        )
      },
    ),
  )
}
