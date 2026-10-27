import type { Remote } from '@sand/host-remotes/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, keys, sig } from '@vaakx-dev/vrui'
import type { LoginState } from '../../contract'
import { problem } from '../parts'
import { remoteRow } from '../remote'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'
import { nextAction } from './next'

export const joinView = (kit: Kit, model: WelcomeModel) => {
  const { primaryAction, quietButton, setupColumn, setupFooter, setupHeading, setupNote, setupScreen, textInput } = kit
  const link = sig('')
  const connect = () => void model.join(link.get())
  return setupScreen(
    setupHeading('Connect to your other PC'),
    setupNote('On that PC, open Settings → Devices → Add a PC → Connect a PC that has sand, then copy its link.'),
    setupColumn(
      textInput({ placeholder: 'Link from the other PC', 'aria-label': 'Pairing link', bindValue: link, onKeyDown: keys({ Enter: connect }), onMount: node => node.focus() }),
      problem(kit, () => model.error.get()),
    ),
    setupFooter(
      quietButton({ onClick: () => model.go('start') }, 'Back'),
      primaryAction({ disabled: () => model.busy.get() || !link.get().trim(), onClick: connect }, () => (model.busy.get() ? 'Connecting…' : 'Connect')),
    ),
  )
}

const sharedFrom = (kit: Kit, state: LoginState | undefined, pc: Remote) => {
  const { emptyState, loadingState, settingsSection } = kit
  const accounts = state?.remote.filter(account => account.device === pc.id) ?? []
  if (state && accounts.length) return settingsSection({}, accounts.map(account => remoteRow(kit, state, account)))
  const checked = state?.pcs.find(found => found.device === pc.id)?.checked
  if (!checked) return loadingState({ flush: true, text: `Looking for ${pc.name}'s accounts…` })
  return emptyState({ flush: true, text: `${pc.name} doesn't share any accounts yet. Turn on "Share with my PCs" there, or sign in here.` })
}

export const joinedView = (kit: Kit, model: WelcomeModel, control: LoginControl, pc: Remote) => {
  const { doneMark, setupColumn, setupHeading, setupScreen } = kit
  return setupScreen(
    doneMark(),
    setupHeading(`Connected to ${pc.name}`),
    setupColumn(dynamicChild(derive(() => JSON.stringify(control.state.get() ?? null)), () => sharedFrom(kit, control.state.get(), pc))),
    nextAction(kit, model),
  )
}
