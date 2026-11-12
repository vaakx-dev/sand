import type { Need, NeedSource } from '@sand/needs-you/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, type Sig } from '@vaakx-dev/vrui'
import type { SshState } from '../contract'

const title = 'Needs your password or host key to connect'

export const sshNeeds = (kit: Kit, state: Sig<SshState>, open: () => void): NeedSource => {
  const since = new Map<string, number>()
  const firstSeen = (pc: string) => {
    const at = since.get(pc) ?? Date.now()
    since.set(pc, at)
    return at
  }
  const items = (): Need[] => {
    const waiting = state.get().machines.filter(machine => machine.state === 'needs-you')
    for (const pc of since.keys()) if (!waiting.some(machine => machine.pc === pc)) since.delete(pc)
    return waiting.map(machine => ({
      id: `ssh:${machine.pc}`,
      kind: 'secret',
      who: machine.name,
      title,
      at: firstSeen(machine.pc),
      open,
      render: () =>
        div(
          { class: 'flex flex-col gap-2' },
          div({ class: 'text-sm text-neutral-200' }, title),
          div({ class: 'flex justify-end' }, kit.quietButton({ size: 'sm', onClick: open }, 'Open Devices')),
        ),
    }))
  }
  return { id: 'ssh', items }
}
