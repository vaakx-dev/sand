import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { sig, span, stopThen } from '@vaakx-dev/vrui'
import { loginShared, type LoginAccount } from '../contract'
import { accountLogo, howText } from './names'
import { accountSpec, removeAction, type RowActions } from './account-menu'
import { whileBusy } from './parts'
import type { LoginControl } from './state'

interface Rows {
  kit: Kit
  control: LoginControl
  actions: RowActions
  menu: ContextMenu
}

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
  if (account.env) return `API key from ${account.env}`
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

export const SHARE_NOTE = 'Turn an account’s switch on to share it with your PCs.'

export const shareable = (account: LoginAccount) => account.signedIn && !account.env

const renameButton = ({ icon, iconButton }: Kit, account: LoginAccount, { rename }: RowActions) =>
  account.signIn ? iconButton({ size: 'sm', title: 'Rename', 'aria-label': `Rename ${account.label}`, onClick: () => rename(account) }, icon('pencil', 'sm')) : null

const rowControls = ({ kit, control, actions }: Rows, account: LoginAccount) => {
  const { quietButton } = kit
  if (account.env) return []
  const server = account.kind === 'server'
  return [
    server && account.error ? quietButton({ size: 'sm', onClick: () => actions.fix(account) }, 'Edit') : null,
    shareable(account) ? shareSwitch(kit, account, control) : null,
    renameButton(kit, account, actions),
    removeButton(kit, account, control),
  ]
}

const signedInRow = (rows: Rows, account: LoginAccount, pooled: boolean) => {
  const { kit, control, actions, menu } = rows
  const spec = () => accountSpec(account, control, actions)
  const look = pooled ? { ...(account.email && { detail: account.email }) } : { lead: accountLogo(kit, account.provider), detail: detail(kit, account) }
  return kit.settingsRow(
    { ...menu.target(spec), ...look, title: account.label },
    ...rowControls(rows, account),
    menu.button(spec),
  )
}

const brokenDetail = (account: LoginAccount) => (account.error ? span({ class: 'text-danger-400' }, account.error) : 'Not signed in')

const brokenRow = ({ kit, control, actions }: Rows, account: LoginAccount, pooled: boolean) => {
  const { secondaryAction, settingsRow } = kit
  return settingsRow(
    { ...(!pooled && { lead: accountLogo(kit, account.provider) }), title: account.label, detail: brokenDetail(account) },
    secondaryAction({ size: 'sm', onClick: () => actions.fix(account) }, fixLabel(account)),
    account.added ? removeButton(kit, account, control) : null,
  )
}

const accountRow = (rows: Rows, account: LoginAccount, pooled = false) => (account.signedIn ? signedInRow(rows, account, pooled) : brokenRow(rows, account, pooled))

export { accountRow, type Rows }
