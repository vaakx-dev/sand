import type { PcMarks } from '@sand/devices-contract'
import type { Need, NeedSource } from '@sand/needs-you/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { SshState } from '../contract'

const title = 'Can’t connect until you enter its password.'

export const sshNeeds = (kit: Kit, marks: () => PcMarks | undefined, state: Sig<SshState>, reconnect: (pc: string) => Promise<void>): NeedSource => {
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
      mark: () => marks()?.icon(machine.pc) ?? kit.icon('monitor', 'sm'),
      title,
      at: firstSeen(machine.pc),
      actions: [{ label: 'Enter password', run: () => reconnect(machine.pc) }],
    }))
  }
  return { id: 'ssh', items }
}
