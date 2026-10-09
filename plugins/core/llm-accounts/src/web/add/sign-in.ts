import { copyButton, div, dot, keys, onInterval, p, primaryAction, secondaryAction, sig, span, textInput } from '@sand/dom'
import type { LoginAccount, LoginPending } from '../../contract'
import { busyAction, hostOf, note, openLink, type Busy } from '../parts'
import type { LoginControl } from '../state'

type Paste = Extract<LoginPending, { kind: 'paste' }>
type Device = Extract<LoginPending, { kind: 'device' }>

export type Phase = 'starting' | 'conflict' | 'paste' | 'device' | 'error'

export interface SignInActions {
  keep(): void
  anyway(): void
  retry(): void
}

export const phaseOf = (account: LoginAccount | undefined): Phase => {
  if (account?.conflict) return 'conflict'
  if (account?.pending) return account.pending.kind
  return account?.error ? 'error' : 'starting'
}

const actions = (...children: Parameters<typeof div>[1][]) => div({ class: 'flex flex-wrap items-center justify-end gap-2' }, ...children)

const problem = (account: () => LoginAccount | undefined) => p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !account()?.error }, () => account()?.error ?? '')

const step = (number: string, text: string, ...extra: Parameters<typeof div>[1][]) =>
  div(
    { class: 'flex items-center gap-3 text-sm text-neutral-200' },
    span({ class: 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs text-neutral-300' }, number),
    span({ class: 'min-w-0 flex-1' }, text),
    ...extra,
  )

const conflictView = (account: LoginAccount, actionsFor: SignInActions, busy: Busy) => {
  const pc = account.conflict?.pc ?? 'Another PC'
  return div(
    { class: 'flex flex-col gap-4' },
    div(
      { class: 'rounded-xl bg-warning-950 px-4 py-3 text-sm text-neutral-200' },
      `${pc} already shares a ${account.subscription} account with this PC. A second sign-in to the same account would keep logging the other one out.`,
    ),
    actions(
      secondaryAction({ disabled: busy, onClick: actionsFor.anyway }, 'Sign in here anyway'),
      primaryAction({ disabled: busy, onClick: actionsFor.keep }, `Keep using ${pc}'s`),
    ),
  )
}

const pasteView = (account: () => LoginAccount | undefined, pending: Paste, control: LoginControl, busy: Busy) => {
  const code = sig('')
  const ready = () => !busy.get() && !!code.get().trim()
  const finish = busyAction(busy, () => control.run({ type: 'login.finish', provider: 'anthropic', code: code.get().trim() }))
  return div(
    { class: 'flex flex-col gap-4' },
    step('1', 'Approve sand in your browser', openLink(pending.url)),
    step('2', 'Paste the code it shows'),
    textInput({
      class: 'bg-neutral-900',
      placeholder: `Code from ${hostOf(pending.url)}`,
      'aria-label': 'Sign-in code',
      bindValue: code,
      onKeyDown: keys({ Enter: () => ready() && void finish() }),
    }),
    problem(account),
    actions(copyButton({ text: () => pending.url, label: 'Copy link', size: 'md' }), primaryAction({ disabled: () => !ready(), onClick: () => void finish() }, 'Sign in')),
  )
}

const countdown = (expires: number) => {
  const now = sig(Date.now())
  onInterval(() => now.set(Date.now()), 1000)
  return () => {
    const seconds = Math.max(0, Math.round((expires - now.get()) / 1000))
    return seconds ? `Waiting… ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} left` : 'The code expired. Close this and try again.'
  }
}

const deviceView = (pending: Device) =>
  div(
    { class: 'flex flex-col gap-4' },
    note('Open the link on any device and enter this code.'),
    div(
      { class: 'flex items-center justify-center gap-2 py-2' },
      span({ class: 'font-mono text-3xl font-semibold text-neutral-100' }, pending.code),
      copyButton({ text: () => pending.code }),
    ),
    div(
      { class: 'flex flex-wrap items-center justify-between gap-3' },
      openLink(pending.url),
      span({ class: 'flex items-center gap-2 text-xs text-neutral-400', role: 'status' }, dot('warning'), countdown(pending.expires)),
    ),
  )

const errorView = (account: LoginAccount, actionsFor: SignInActions, busy: Busy) =>
  div(
    { class: 'flex flex-col gap-4' },
    p({ class: 'text-sm wrap-anywhere text-danger-400' }, account.error ?? 'Sign-in failed'),
    actions(primaryAction({ disabled: busy, onClick: actionsFor.retry }, 'Try again')),
  )

export const signInView = (phase: Phase, account: () => LoginAccount | undefined, control: LoginControl, actionsFor: SignInActions, busy: Busy) => {
  const current = account()
  if (phase === 'conflict' && current) return conflictView(current, actionsFor, busy)
  if (current?.pending?.kind === 'paste') return pasteView(account, current.pending, control, busy)
  if (current?.pending?.kind === 'device') return deviceView(current.pending)
  if (phase === 'error' && current) return errorView(current, actionsFor, busy)
  return note('Starting…')
}
