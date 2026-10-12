import { openTab } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, p, span, type Child } from '@vaakx-dev/vrui'
import type { GithubPending } from '../../contract'
import type { SignInModel } from './model'

const finePrint = () =>
  p(
    { class: 'text-xs text-neutral-500' },
    "Behind the scenes, sand runs gh auth login and keeps the token with your other sign-ins. Every agent's shell gets it as GH_TOKEN.",
  )

const phaseView = ({ sheetStep }: Kit, body: Child, ...foot: Child[]) => sheetStep([body, finePrint()], ...foot)

const foundView = (kit: Kit, model: SignInModel) => {
  const { callout, primaryAction, secondaryAction } = kit
  const login = model.found.get()?.login ?? ''
  return phaseView(
    kit,
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

const deviceView = (kit: Kit, pending: GithubPending) => {
  const { deviceCode, icon, note, primaryAction, waitingLine } = kit
  return phaseView(kit, [
    note('Enter this code on GitHub:'),
    deviceCode(pending.code),
    primaryAction({ class: 'self-start', onClick: () => openTab(pending.url) }, icon('external', 16), `Open ${deviceHost(pending.url)}`),
    waitingLine('Waiting for GitHub…'),
  ])
}

const errorView = (kit: Kit, model: SignInModel) => {
  const { errorText, primaryAction } = kit
  return phaseView(
    kit,
    errorText(model.state.get()?.error ?? 'Sign-in failed'),
    primaryAction({ disabled: model.busy, onClick: () => void model.start() }, 'Retry'),
  )
}

const body = (kit: Kit, model: SignInModel) => {
  const { note } = kit
  const phase = model.phase.get()
  const pending = model.state.get()?.pending
  if (phase === 'finding') return phaseView(kit, note('Looking for a gh login on this PC…'))
  if (phase === 'found') return foundView(kit, model)
  if (phase === 'error') return errorView(kit, model)
  if (phase === 'device' && pending) return deviceView(kit, pending)
  return phaseView(kit, note('Starting gh auth login…'))
}

export const signInSheet = (kit: Kit, model: SignInModel, close: () => void) => {
  const { overlay, sheet, sheetHead } = kit
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Sign in to GitHub', size: 'md' },
      sheetHead({ title: 'Sign in to GitHub', close }),
      dynamicChild(model.key, () => body(kit, model)),
    ),
  )
}
