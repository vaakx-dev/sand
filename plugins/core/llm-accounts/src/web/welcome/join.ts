import { derive, doneMark, dynamicChild, keys, primaryAction, quietButton, settingsSection, setupColumn, setupFooter, setupHeading, setupScreen, sig, textInput } from '@sand/dom'
import type { Remote } from '@sand/host-remotes/contract'
import type { LoginState } from '../../contract'
import { note, problem } from '../parts'
import { remoteRow } from '../remote'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'
import { nextAction } from './next'

export const joinView = (model: WelcomeModel) => {
  const link = sig('')
  const connect = () => void model.join(link.get())
  return setupScreen(
    setupHeading('Connect to your other PC'),
    setupColumn(
      note('On that PC, open Settings → Your devices → Add a PC → It already has sand, copy its link and paste it here.'),
      textInput({ placeholder: 'Link from the other PC', 'aria-label': 'Pairing link', bindValue: link, onKeyDown: keys({ Enter: connect }), onMount: node => node.focus() }),
      problem(() => model.error.get()),
    ),
    setupFooter(
      quietButton({ onClick: () => model.go('start') }, 'Back'),
      primaryAction({ disabled: () => model.busy.get() || !link.get().trim(), onClick: connect }, () => (model.busy.get() ? 'Connecting…' : 'Connect')),
    ),
  )
}

const sharedFrom = (state: LoginState | undefined, pc: Remote) => {
  const accounts = state?.remote.filter(account => account.device === pc.id) ?? []
  if (state && accounts.length) return settingsSection({}, accounts.map(account => remoteRow(state, account)))
  const checked = state?.pcs.find(found => found.device === pc.id)?.checked
  return note(checked ? `${pc.name} doesn't share any accounts yet. Turn on "Share with my PCs" there, or sign in here.` : `Looking for ${pc.name}'s accounts…`)
}

export const joinedView = (model: WelcomeModel, control: LoginControl, pc: Remote) =>
  setupScreen(
    doneMark(),
    setupHeading(`Connected to ${pc.name}`),
    setupColumn(dynamicChild(derive(() => JSON.stringify(control.state.get() ?? null)), () => sharedFrom(control.state.get(), pc))),
    nextAction(model),
  )
