import type { PcView } from '@sand/devices-contract'
import type { SshHost } from '@sand/devices-ssh/contract'
import { derive, div, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import type { Step } from './run'

const platforms: Record<string, string> = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }

const describe = (pc: PcView) => {
  if (!pc.online) return 'Offline'
  if (pc.home) return 'This PC'
  return [pc.platform && (platforms[pc.platform] ?? pc.platform), pc.address].filter(Boolean).join(' · ')
}

const order = (a: PcView, b: PcView) => Number(b.home) - Number(a.home) || Number(b.online) - Number(a.online) || a.name.localeCompare(b.name)

export const pcsStep = (ctx: ProjectsContext, pcs: Derive<PcView[]>, hosts: Derive<SshHost[]>, choose: (device: string) => void, connect: (host: SshHost) => void): Step => {
  const { icon, listRow, rowList } = ctx.kit
  const sorted = derive(() => pcs.get().toSorted(order))
  const row = (pc: Sig<PcView>) =>
    listRow({
      surface: 'raised',
      touch: true,
      title: () => pc.get().name,
      meta: () => describe(pc.get()),
      disabled: () => !pc.get().online,
      onClick: () => choose(pc.get().id),
    })
  const hostRow = (host: Sig<SshHost>) =>
    listRow({
      surface: 'raised',
      touch: true,
      lead: icon('term', 'sm'),
      title: () => host.get().name,
      meta: () => host.get().target,
      onClick: () => connect(host.get()),
    })
  return { body: div({ class: 'flex flex-col' }, rowList(sorted, pc => pc.id, row), rowList(hosts, host => host.id, hostRow)) }
}
