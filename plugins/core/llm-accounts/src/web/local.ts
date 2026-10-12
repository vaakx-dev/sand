import { contextMenu, derive, div, dot, dynamicChild, hintRow, itemRow, label, rowAction, secondaryAction, settingsSection, sig, span, toggleSwitch, type ContextMenu } from '@sand/dom'
import type { LoginAccount, LoginState } from '../contract'
import { accountLogo, howText } from './names'
import { accountSpec } from './account-menu'
import { whileBusy } from './parts'
import type { LoginControl } from './state'

type Fix = (account: LoginAccount) => void

const shareSwitch = (account: LoginAccount, control: LoginControl) => {
  const busy = sig(false)
  const toggle = () => whileBusy(busy, () => control.run({ type: 'login.shared', account: account.id, shared: !account.shared }))
  return label(
    { class: 'flex items-center gap-2 text-xs text-neutral-400' },
    'Share with my PCs',
    toggleSwitch({ on: account.shared, 'aria-label': `Share ${account.label} with my PCs`, disabled: busy, onClick: () => void toggle() }),
  )
}

const serverDetail = (account: LoginAccount) =>
  span(
    { class: 'flex min-w-0 items-center gap-2' },
    dot(account.error ? 'danger' : 'success'),
    span({ class: 'truncate' }, account.url ?? ''),
    account.error ? span({ class: 'truncate text-danger-400' }, account.error) : null,
  )

const detail = (account: LoginAccount) => {
  if (account.env) return `API key from ${account.env} · stays on this PC`
  if (account.kind === 'server') return serverDetail(account)
  return [howText(account), account.email].filter(Boolean).join(' · ')
}

const fixLabel = (account: LoginAccount) => (account.kind === 'server' ? 'Edit' : 'Sign in again')

const rowControls = (account: LoginAccount, control: LoginControl, fix: Fix) => {
  if (account.env) return []
  const server = account.kind === 'server'
  return [
    server && account.error ? secondaryAction({ size: 'sm', onClick: () => fix(account) }, 'Edit') : null,
    shareSwitch(account, control),
    rowAction({ label: server ? 'Remove' : 'Sign out', danger: true, run: () => void control.run({ type: 'login.logout', account: account.id }) }),
  ]
}

const signedInRow = (account: LoginAccount, control: LoginControl, fix: Fix, menu: ContextMenu) =>
  itemRow(
    menu.target(() => accountSpec(account, control, fix)),
    accountLogo(account.provider),
    account.label,
    detail(account),
    ...rowControls(account, control, fix),
  )

const brokenRow = (account: LoginAccount, fix: Fix) =>
  itemRow(
    {},
    accountLogo(account.provider),
    account.label,
    span({ class: 'text-danger-400' }, account.error ?? ''),
    secondaryAction({ size: 'sm', onClick: () => fix(account) }, fixLabel(account)),
  )

const shown = (state: LoginState) => state.accounts.filter(account => account.signedIn || (account.error && !account.pending))

const emptyText = (state: LoginState) => (state.remote.length ? 'No accounts yet. Add one, or use the ones below' : 'No accounts yet. Add one to start using sand')

export const localSection = (control: LoginControl, fix: Fix) => {
  const menu = contextMenu()
  return settingsSection(
    { title: 'On this PC' },
    menu.view(),
    dynamicChild(
      derive(() => {
        const state = control.state.get()
        return JSON.stringify(state ? [shown(state), state.remote.length > 0] : null)
      }),
      () => {
        const state = control.state.get()
        if (!state) return hintRow('Loading…')
        const list = shown(state)
        if (!list.length) return hintRow(emptyText(state))
        return div(
          { class: 'contents' },
          list.map(account => (account.signedIn ? signedInRow(account, control, fix, menu) : brokenRow(account, fix))),
        )
      },
    ),
  )
}
