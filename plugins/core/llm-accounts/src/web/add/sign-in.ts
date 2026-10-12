import { callout, clock, copyButton, deviceCode, div, errorText, keys, note, primaryAction, secondaryAction, sheetStep, sig, span, textInput, untrack, waitingLine, type Child, type Sig } from '@sand/dom'
import type { LoginAccount, LoginPending, SignInKind } from '../../contract'
import { planNames } from '../names'
import { hostOf, openLink, problem, whileBusy } from '../parts'
import type { LoginControl } from '../state'

type Paste = Extract<LoginPending, { kind: 'paste' }>
type Device = Extract<LoginPending, { kind: 'device' }>
type Busy = Sig<boolean>

type Phase = 'starting' | 'conflict' | 'paste' | 'device' | 'error'

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

const step = (number: string, text: string, ...extra: Child[]) =>
  div(
    { class: 'flex items-center gap-3 text-sm text-neutral-200' },
    span({ class: 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs text-neutral-300' }, number),
    span({ class: 'min-w-0 flex-1' }, text),
    ...extra,
  )

const conflictView = (kind: SignInKind, account: LoginAccount, actionsFor: SignInActions, busy: Busy) => {
  const pc = account.conflict?.pc ?? 'Another PC'
  return sheetStep(
    callout(
      'warning',
      span(
        { class: 'min-w-0 flex-1' },
        `${pc} already shares a ${planNames[kind]} account with this PC. A second sign-in to the same account would keep logging the other one out.`,
      ),
    ),
    secondaryAction({ disabled: busy, onClick: actionsFor.anyway }, 'Sign in here anyway'),
    primaryAction({ disabled: busy, onClick: actionsFor.keep }, `Keep using ${pc}'s`),
  )
}

const pasteView = (kind: SignInKind, account: () => LoginAccount | undefined, pending: Paste, control: LoginControl, busy: Busy) => {
  const code = sig('')
  const ready = () => !busy.get() && !!code.get().trim()
  const submit = () => {
    if (ready()) void whileBusy(busy, () => control.run({ type: 'login.finish', account: kind, code: code.get().trim() }))
  }
  return sheetStep(
    [
      step('1', 'Approve sand in your browser', openLink(pending.url)),
      step('2', 'Paste the code it shows'),
      textInput({
        placeholder: `Code from ${hostOf(pending.url)}`,
        'aria-label': 'Sign-in code',
        bindValue: code,
        onKeyDown: keys({ Enter: submit }),
      }),
      problem(() => account()?.error ?? ''),
    ],
    copyButton({ text: () => pending.url, label: 'Copy link', size: 'md' }),
    primaryAction({ disabled: () => !ready(), onClick: submit }, 'Sign in'),
  )
}

const countdown = (expires: number) => {
  const now = clock()
  return () => {
    const seconds = Math.max(0, Math.round((expires - now.get()) / 1000))
    if (!seconds) return 'The code expired. Close this and start again.'
    return `Waiting… ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} left`
  }
}

const deviceView = (pending: Device) =>
  sheetStep([
    note('Open the link on any device and enter this code.'),
    deviceCode(pending.code),
    div({ class: 'flex flex-wrap items-center justify-between gap-3' }, openLink(pending.url), waitingLine(countdown(pending.expires))),
  ])

const errorView = (account: LoginAccount, actionsFor: SignInActions, busy: Busy) =>
  sheetStep(errorText(account.error ?? 'Sign-in failed'), primaryAction({ disabled: busy, onClick: actionsFor.retry }, 'Retry'))

export const signInView = (kind: SignInKind, phase: Phase, control: LoginControl, actionsFor: SignInActions, busy: Busy) => {
  const account = () => control.account(kind)
  const current = untrack(account)
  if (phase === 'conflict' && current) return conflictView(kind, current, actionsFor, busy)
  if (current?.pending?.kind === 'paste') return pasteView(kind, account, current.pending, control, busy)
  if (current?.pending?.kind === 'device') return deviceView(current.pending)
  if (phase === 'error' && current) return errorView(current, actionsFor, busy)
  return sheetStep(note('Starting…'))
}
