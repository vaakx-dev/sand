import type { DiscoveredPc } from '@sand/devices-contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild } from '@vaakx-dev/vrui'
import type { LoginState } from '../../contract'
import { problem } from '../parts'
import { remoteRow } from '../remote'
import type { LoginControl } from '../state'
import type { JoinedPc, PcJoining } from './joining'
import type { WelcomeModel } from './model'
import { nextAction } from './next'

const foundRows = (kit: Kit, joining: PcJoining) => {
  const { emptyState, icon, listRow, settingsSection } = kit
  const unpaired = joining.found.get().filter(pc => !pc.paired)
  if (!unpaired.length) return emptyState({ flush: true, text: 'Looking for sand on your home wifi and Tailscale…' })
  const row = (pc: DiscoveredPc) =>
    listRow({
      surface: 'group',
      lead: icon('link'),
      title: `Join ${pc.name}`,
      meta: pc.via === 'lan' ? 'Home wifi' : 'Tailscale',
      onClick: () => void joining.join(pc),
    })
  return settingsSection({}, unpaired.map(row))
}

const waitingNote = (kit: Kit, joining: PcJoining) => {
  const asked = joining.waiting.get()
  if (!asked) return null
  return kit.emptyState({ flush: true, text: `Waiting for someone to tap Allow on a paired device. The code there reads ${asked.code}.` })
}

export const joinView = (kit: Kit, model: WelcomeModel) => {
  const { quietButton, setupColumn, setupFooter, setupHeading, setupNote, setupScreen } = kit
  const { joining } = model
  return setupScreen(
    setupHeading('Join your other PC'),
    setupNote('Pick the PC that already has sand. Someone with a paired device then taps Allow.'),
    setupColumn(
      dynamicChild(derive(() => JSON.stringify(joining.found.get())), () => foundRows(kit, joining)),
      dynamicChild(derive(() => joining.waiting.get()?.id ?? ''), () => waitingNote(kit, joining)),
      problem(kit, () => joining.error.get()),
    ),
    setupFooter(quietButton({ onClick: () => model.go('start') }, 'Back')),
  )
}

const sharedFrom = (kit: Kit, state: LoginState | undefined, pc: JoinedPc) => {
  const { emptyState, loadingState, settingsSection } = kit
  const accounts = state?.remote.filter(account => account.device === pc.id) ?? []
  if (state && accounts.length) return settingsSection({}, accounts.map(account => remoteRow(kit, state, account)))
  const checked = state?.pcs.find(found => found.device === pc.id)?.checked
  if (!checked) return loadingState({ flush: true, text: `Looking for ${pc.name}'s accounts…` })
  return emptyState({ flush: true, text: `${pc.name} doesn't share any accounts yet. Turn on "Share with my PCs" there, or sign in here.` })
}

export const joinedView = (kit: Kit, model: WelcomeModel, control: LoginControl, pc: JoinedPc) => {
  const { doneMark, setupColumn, setupHeading, setupScreen } = kit
  return setupScreen(
    doneMark(),
    setupHeading(`Connected to ${pc.name}`),
    setupColumn(dynamicChild(derive(() => JSON.stringify(control.state.get() ?? null)), () => sharedFrom(kit, control.state.get(), pc))),
    nextAction(kit, model),
  )
}
