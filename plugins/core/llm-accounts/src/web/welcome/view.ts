import { choiceButton, choiceList, derive, div, doneMark, dynamicChild, el, icon, keys, layer, p, primaryAction, quietButton, show, sig, SPACE, span, textInput, tile } from '@sand/dom'
import type { Remote } from '@sand/host-remotes/contract'
import type { LoginState } from '../../contract'
import { accountLogo } from '../names'
import { note } from '../parts'
import { remoteRow } from '../remote'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'

const heading = (text: string) => el('h2', { class: 'text-xl font-semibold text-neutral-100' }, text)

const column = (...children: Parameters<typeof div>[1][]) => div({ class: 'flex w-full max-w-sm flex-col gap-3 text-left' }, ...children)

const startView = (model: WelcomeModel, signIn: () => void) =>
  div(
    { class: 'flex w-full flex-col items-center gap-6' },
    heading('Welcome to sand'),
    column(
      choiceList(
        choiceButton({ mark: tile(icon('link', 16)), title: 'I use sand on another PC', detail: 'Connect to it and use its accounts', onClick: () => model.go('join') }),
        choiceButton({ mark: accountLogo('anthropic'), title: 'Sign in to an AI account', detail: 'Claude, ChatGPT, an API key or a local server', onClick: signIn }),
      ),
    ),
    quietButton({ size: 'sm', onClick: model.finish }, 'Skip for now'),
  )

const joinView = (model: WelcomeModel) => {
  const link = sig('')
  const connect = () => void model.join(link.get())
  return div(
    { class: 'flex w-full flex-col items-center gap-6' },
    heading('Connect to your other PC'),
    column(
      note('On that PC, open Settings → Your devices → Add a PC → It already has sand, copy its link and paste it here.'),
      textInput({ placeholder: 'Link from the other PC', 'aria-label': 'Pairing link', bindValue: link, onKeyDown: keys({ Enter: connect }), onMount: node => node.focus() }),
      p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !model.error.get() }, () => model.error.get()),
      div(
        { class: 'flex items-center justify-between gap-2' },
        quietButton({ onClick: () => model.go('start') }, 'Back'),
        primaryAction({ disabled: () => model.busy.get() || !link.get().trim(), onClick: connect }, () => (model.busy.get() ? 'Connecting…' : 'Connect')),
      ),
    ),
  )
}

const sharedFrom = (state: LoginState | undefined, pc: Remote) => {
  const accounts = state?.remote.filter(account => account.device === pc.id) ?? []
  if (state && accounts.length)
    return div({ class: 'flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800', style: { rowGap: SPACE.px } }, accounts.map(account => remoteRow(state, account)))
  const checked = state?.pcs.find(found => found.device === pc.id)?.checked
  return note(checked ? `${pc.name} doesn't share any accounts yet. Turn on "Share with my PCs" there, or sign in here.` : `Looking for ${pc.name}'s accounts…`)
}

const joinedView = (model: WelcomeModel, control: LoginControl, pc: Remote) =>
  div(
    { class: 'flex w-full flex-col items-center gap-6' },
    doneMark(),
    heading(`Connected to ${pc.name}`),
    column(dynamicChild(derive(() => JSON.stringify(control.state.get() ?? null)), () => sharedFrom(control.state.get(), pc))),
    primaryAction({ onClick: model.finish }, 'Start a thread'),
  )

const body = (model: WelcomeModel, control: LoginControl, signIn: () => void) =>
  dynamicChild(model.step, step => {
    const pc = model.joined.get()
    if (step === 'joined' && pc) return joinedView(model, control, pc)
    return step === 'join' ? joinView(model) : startView(model, signIn)
  })

export const welcomeView = (model: WelcomeModel, control: LoginControl, signIn: () => void) =>
  show(model.active, () =>
    div(
      { class: [layer.drawer, 'absolute inset-0 flex flex-col items-center overflow-auto bg-neutral-900 px-5 py-10 text-center'] },
      span({ class: 'flex-1' }),
      body(model, control, signIn),
      span({ class: 'flex-1' }),
    ),
  )
