import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, label, sig, span } from '@vaakx-dev/vrui'
import { loginLogout, loginShared, type LoginAccount, type LoginState } from '../contract'
import { accountLogo, howText, removeLabel } from './names'
import { accountSpec } from './account-menu'
import { whileBusy } from './parts'
import type { LoginControl } from './state'

type Fix = (account: LoginAccount) => void

const shareSwitch = ({ toggleSwitch }: Kit, account: LoginAccount, control: LoginControl) => {
  const busy = sig(false)
  const toggle = () => whileBusy(busy, () => control.run(loginShared, { account: account.id, shared: !account.shared }))
  return label(
    { class: 'flex items-center gap-2 text-xs text-neutral-400' },
    'Share with my PCs',
    toggleSwitch({ on: account.shared, 'aria-label': `Share ${account.label} with my PCs`, disabled: busy, onClick: () => void toggle() }),
  )
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

const fixLabel = (account: LoginAccount) => (account.kind === 'server' ? 'Edit' : 'Sign in again')

const rowControls = (kit: Kit, account: LoginAccount, control: LoginControl, fix: Fix) => {
  const { quietButton, rowAction } = kit
  if (account.env) return []
  const server = account.kind === 'server'
  return [
    server && account.error ? quietButton({ size: 'sm', surface: 'group', onClick: () => fix(account) }, 'Edit') : null,
    account.app ? null : shareSwitch(kit, account, control),
    rowAction({ label: removeLabel(account), danger: true, run: () => void control.run(loginLogout, { account: account.id }) }),
  ]
}

const signedInRow = (kit: Kit, account: LoginAccount, control: LoginControl, fix: Fix, menu: ContextMenu) => {
  const { settingsRow } = kit
  return settingsRow(
    { ...menu.target(() => accountSpec(account, control, fix)), lead: accountLogo(kit, account.provider), title: account.label, detail: detail(kit, account) },
    ...rowControls(kit, account, control, fix),
  )
}

const brokenRow = (kit: Kit, account: LoginAccount, fix: Fix) => {
  const { secondaryAction, settingsRow } = kit
  return settingsRow(
    { lead: accountLogo(kit, account.provider), title: account.label, detail: span({ class: 'text-danger-400' }, account.error ?? '') },
    secondaryAction({ size: 'sm', onClick: () => fix(account) }, fixLabel(account)),
  )
}

const shown = (state: LoginState) => state.accounts.filter(account => account.signedIn || (account.error && !account.pending))

const emptyText = (state: LoginState) =>
  state.remote.length ? 'No accounts on this PC yet. The ones from your PCs below work too.' : 'No accounts on this PC yet. Add one to start using sand.'

export const localSection = (kit: Kit, control: LoginControl, add: () => void, fix: Fix) => {
  const { contextMenu, emptyState, icon, loadingState, quietButton, settingsSection } = kit
  const menu = contextMenu()
  return settingsSection(
    { title: 'On this PC', action: quietButton({ size: 'sm', onClick: add }, icon('plus', 'sm'), 'Add an account') },
    menu.view(),
    dynamicChild(
      derive(() => {
        const state = control.state.get()
        return JSON.stringify(state ? [shown(state), state.remote.length > 0] : null)
      }),
      () => {
        const state = control.state.get()
        if (!state) return loadingState({ surface: 'group' })
        const list = shown(state)
        if (!list.length) return emptyState({ surface: 'group', text: emptyText(state) })
        return div(
          { class: 'contents' },
          list.map(account => (account.signedIn ? signedInRow(kit, account, control, fix, menu) : brokenRow(kit, account, fix))),
        )
      },
    ),
  )
}
