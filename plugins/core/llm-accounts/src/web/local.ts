import { derive, div, dynamicChild, hint, label, rowAction, secondaryAction, settingsSection, sig, span, toggleSwitch } from '@sand/dom'
import type { LoginAccount, LoginProvider, LoginState } from '@sand/protocol'
import { accountLogo, accountTitle, howText } from './names'
import { accountRow, busyAction } from './parts'
import type { LoginControl } from './state'

const shareSwitch = (account: LoginAccount, control: LoginControl) => {
  const busy = sig(false)
  const toggle = busyAction(busy, () => control.run({ type: 'login.shared', provider: account.provider, shared: !account.shared }))
  return label(
    { class: 'flex items-center gap-2 text-xs text-neutral-400' },
    'Share with my PCs',
    toggleSwitch({ on: account.shared, 'aria-label': `Share ${accountTitle(account)} with my PCs`, disabled: busy, onClick: () => void toggle() }),
  )
}

const detail = (account: LoginAccount) => {
  if (account.env) return `API key from ${account.env} · stays on this PC`
  return [howText(account), account.email].filter(Boolean).join(' · ')
}

const signedInRow = (account: LoginAccount, control: LoginControl) =>
  accountRow(
    accountLogo(account.provider),
    accountTitle(account),
    detail(account),
    ...(account.env
      ? []
      : [shareSwitch(account, control), rowAction({ label: 'Sign out', danger: true, run: () => void control.run({ type: 'login.logout', provider: account.provider }) })]),
  )

const brokenRow = (account: LoginAccount, signIn: (provider: LoginProvider) => void) =>
  accountRow(
    accountLogo(account.provider),
    account.subscription,
    span({ class: 'text-danger-400' }, account.error ?? ''),
    secondaryAction({ size: 'sm', onClick: () => signIn(account.provider) }, 'Sign in again'),
  )

const shown = (state: LoginState) => state.accounts.filter(account => account.signedIn || (account.error && !account.pending))

const emptyText = (state: LoginState) => (state.remote.length ? 'None yet. Add one, or use the ones below.' : 'None yet. Add one to start using sand.')

export const localSection = (control: LoginControl, signIn: (provider: LoginProvider) => void) =>
  settingsSection(
    { title: 'On this PC' },
    dynamicChild(
      derive(() => {
        const state = control.state.get()
        return JSON.stringify(state ? [shown(state), state.remote.length > 0] : null)
      }),
      () => {
        const state = control.state.get()
        if (!state) return div({ class: 'bg-neutral-900' }, hint('Loading…'))
        const list = shown(state)
        if (!list.length) return div({ class: 'bg-neutral-900' }, hint(emptyText(state)))
        return span(
          { class: 'contents' },
          list.map(account => (account.signedIn ? signedInRow(account, control) : brokenRow(account, signIn))),
        )
      },
    ),
  )
