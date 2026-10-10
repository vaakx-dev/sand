import { copyButton, div, dot, dynamicChild, icon, openTab, overlay, p, primaryAction, secondaryAction, sheet, sheetBody, sheetHead, span, type Child } from '@sand/dom'
import type { GithubPending } from '../../contract'
import type { SignInModel } from './model'

const note = (text: string) => p({ class: 'text-sm text-neutral-400' }, text)

const actions = (...children: Child[]) => div({ class: 'flex flex-wrap items-center justify-end gap-2' }, ...children)

const foundView = (model: SignInModel) => {
  const login = model.found.get()?.login ?? ''
  return div(
    { class: 'flex flex-col gap-4' },
    div(
      { class: 'flex flex-col gap-1 rounded-xl bg-neutral-900 px-4 py-3 ring-1 ring-neutral-700' },
      span({ class: 'flex items-center gap-2 text-sm text-neutral-100' }, icon('check', 14), 'Use the gh login on this PC'),
      span({ class: 'pl-6 text-xs text-neutral-500' }, `Found ${login}. sand shares it with your other PCs.`),
    ),
    actions(
      secondaryAction({ disabled: model.busy, onClick: () => void model.start() }, 'Sign in another way'),
      primaryAction({ disabled: model.busy, onClick: () => void model.use() }, `Use ${login}`),
    ),
  )
}

const deviceHost = (url: string) => url.replace(/^https?:\/\//, '')

const deviceView = (pending: GithubPending) =>
  div(
    { class: 'flex flex-col gap-3' },
    p({ class: 'text-xs text-neutral-400' }, 'Enter this code on GitHub:'),
    span(
      { class: 'self-start rounded-lg bg-neutral-900 px-4 py-2 font-mono text-2xl font-semibold text-neutral-100 ring-1 ring-neutral-700' },
      pending.code,
    ),
    div(
      { class: 'flex flex-wrap items-center gap-2' },
      copyButton({ text: () => pending.code, label: 'Copy', size: 'md' }),
      primaryAction({ onClick: () => openTab(pending.url) }, icon('external', 14), `Open ${deviceHost(pending.url)}`),
    ),
    span({ class: 'flex items-center gap-2 text-xs text-neutral-400', role: 'status' }, dot('warning'), 'Waiting for GitHub…'),
  )

const errorView = (model: SignInModel) =>
  div(
    { class: 'flex flex-col gap-4' },
    p({ class: 'text-sm wrap-anywhere text-danger-400' }, model.state.get()?.error ?? 'Sign-in failed'),
    actions(primaryAction({ disabled: model.busy, onClick: () => void model.start() }, 'Try again')),
  )

const body = (model: SignInModel) => {
  const phase = model.phase.get()
  const pending = model.state.get()?.pending
  if (phase === 'finding') return note('Looking for a gh login on this PC…')
  if (phase === 'found') return foundView(model)
  if (phase === 'error') return errorView(model)
  if (phase === 'device' && pending) return deviceView(pending)
  return note('Starting gh auth login…')
}

export const signInSheet = (model: SignInModel, close: () => void) =>
  overlay(
    close,
    sheet(
      { 'aria-label': 'Sign in to GitHub', class: 'max-w-md' },
      sheetHead('Sign in to GitHub', close),
      sheetBody(
        { class: 'gap-4' },
        dynamicChild(model.key, () => body(model)),
        p(
          { class: 'text-xs text-neutral-500' },
          "Behind the scenes, sand runs gh auth login and keeps the token with your other sign-ins. Every agent's shell gets it as GH_TOKEN.",
        ),
      ),
    ),
  )
