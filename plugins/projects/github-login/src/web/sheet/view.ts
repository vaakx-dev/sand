import { callout, deviceCode, div, dynamicChild, errorText, icon, note, openTab, overlay, p, primaryAction, secondaryAction, sheet, sheetHead, sheetStep, span, waitingLine, type Child } from '@sand/dom'
import type { GithubPending } from '../../contract'
import type { SignInModel } from './model'

const finePrint = () =>
  p(
    { class: 'text-xs text-neutral-500' },
    "Behind the scenes, sand runs gh auth login and keeps the token with your other sign-ins. Every agent's shell gets it as GH_TOKEN.",
  )

const phaseView = (body: Child, ...foot: Child[]) => sheetStep([body, finePrint()], ...foot)

const foundView = (model: SignInModel) => {
  const login = model.found.get()?.login ?? ''
  return phaseView(
    callout(
      'neutral',
      div(
        { class: 'flex min-w-0 flex-1 flex-col gap-1' },
        span({ class: 'text-sm text-neutral-100' }, 'Use the gh login on this PC'),
        span({ class: 'text-neutral-400' }, `Found ${login}. sand shares it with your other PCs.`),
      ),
    ),
    secondaryAction({ disabled: model.busy, onClick: () => void model.start() }, 'Sign in another way'),
    primaryAction({ disabled: model.busy, onClick: () => void model.use() }, `Use ${login}`),
  )
}

const deviceHost = (url: string) => url.replace(/^https?:\/\//, '')

const deviceView = (pending: GithubPending) =>
  phaseView([
    note('Enter this code on GitHub:'),
    deviceCode(pending.code),
    primaryAction({ class: 'self-start', onClick: () => openTab(pending.url) }, icon('external', 16), `Open ${deviceHost(pending.url)}`),
    waitingLine('Waiting for GitHub…'),
  ])

const errorView = (model: SignInModel) =>
  phaseView(
    errorText(model.state.get()?.error ?? 'Sign-in failed'),
    primaryAction({ disabled: model.busy, onClick: () => void model.start() }, 'Retry'),
  )

const body = (model: SignInModel) => {
  const phase = model.phase.get()
  const pending = model.state.get()?.pending
  if (phase === 'finding') return phaseView(note('Looking for a gh login on this PC…'))
  if (phase === 'found') return foundView(model)
  if (phase === 'error') return errorView(model)
  if (phase === 'device' && pending) return deviceView(pending)
  return phaseView(note('Starting gh auth login…'))
}

export const signInSheet = (model: SignInModel, close: () => void) =>
  overlay(
    close,
    sheet(
      { 'aria-label': 'Sign in to GitHub', size: 'md' },
      sheetHead({ title: 'Sign in to GitHub', close }),
      dynamicChild(model.key, () => body(model)),
    ),
  )
