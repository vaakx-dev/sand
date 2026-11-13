import type { Wire } from '@sand/devices-contract'
import type { ConversationRef } from '@sand/engine/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, effect, sig } from '@vaakx-dev/vrui'
import { type Mode, modes, type ModeState, modeWire, permissionMode, permissionModeSet } from '../contract'

export interface Place {
  conversation: ConversationRef
  pc?: string
}

export const modeLabels: Record<Mode, string> = { off: 'Off', ask: 'Ask', auto: 'Auto' }

export const modeDetails: Record<Mode, string> = {
  off: 'Every call runs, as it does today',
  ask: 'Asks you before commands, sends, spending, deleting and files outside the folder',
  auto: 'The sub model decides what would have asked you; it asks you after 3 blocks in a row',
}

export const createModeState = (wire: Wire, place: () => Place | undefined, report: (error: unknown) => void) => {
  const state = sig<ModeState | undefined>(undefined)
  const load = () => {
    const found = place()
    if (!found) return state.set(undefined)
    wire.call(permissionMode, found.conversation, found.pc).then(
      value => {
        if (place()?.conversation.id === found.conversation.id) state.set(value)
      },
      () => state.set(undefined),
    )
  }
  effect(load)
  effect(() => wire.on(modeWire, load, { from: 'all' }))
  const choose = (mode: Mode) => {
    const found = place()
    if (!found) return
    void wire.call(permissionModeSet, { ...found.conversation, mode }, found.pc).then(value => state.set(value), report)
  }
  return { state, choose, load }
}

export type ModeControl = ReturnType<typeof createModeState>

const shownMode = ({ mode, from }: ModeState) => (from ? `${modeLabels[mode]}, from its ${from.owner}` : modeLabels[mode])

export const modeRow = (kit: Kit, control: ModeControl) => {
  const menu = kit.contextMenu()
  const action = (mode: Mode): MenuAction => ({
    id: mode,
    label: modeLabels[mode],
    active: control.state.get()?.mode === mode,
    run: () => control.choose(mode),
  })
  const open = (event: MouseEvent) => menu.openBelow(event, () => ({ title: 'Permissions', actions: modes.map(action) }))
  return div(
    {},
    kit.cardItem(
      {
        lead: kit.icon('shield', 'sm'),
        end: () => {
          const value = control.state.get()
          return value ? shownMode(value) : ''
        },
        menu: true,
        'aria-haspopup': 'menu',
        onClick: open,
      },
      'Permissions',
    ),
    menu.view(),
  )
}
