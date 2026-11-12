import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import { loginShared, type LoginAccount, type LoginState } from '../contract'
import { accountLogo, howText } from './names'
import { accountSpec, removeAction } from './account-menu'
import { whileBusy } from './parts'
import type { LoginControl } from './state'

type Fix = (account: LoginAccount) => void

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

const fixLabel = (account: LoginAccount) => (account.kind === 'server' ? 'Edit' : 'Sign in again')

const rowControls = (kit: Kit, account: LoginAccount, control: LoginControl, fix: Fix) => {
  const { confirmButton, quietButton } = kit
  if (account.env) return []
  const server = account.kind === 'server'
  return [
    server && account.error ? quietButton({ size: 'sm', onClick: () => fix(account) }, 'Edit') : null,
    account.app ? null : shareSwitch(kit, account, control),
    confirmButton({ action: removeAction(account, control) }),
  ]
}

const signedInRow = (kit: Kit, account: LoginAccount, control: LoginControl, fix: Fix, menu: ContextMenu) => {
  const { settingsRow } = kit
  const spec = () => accountSpec(account, control, fix)
  return settingsRow(
    { ...menu.target(spec), lead: accountLogo(kit, account.provider), title: account.label, detail: detail(kit, account) },
    ...rowControls(kit, account, control, fix),
    menu.button(spec),
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
          list.map(account => (account.signedIn ? signedInRow(kit, account, control, fix, menu) : brokenRow(kit, account, fix))),
        )
      },
    ),
  )
}
