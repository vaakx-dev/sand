import { pcs, wire, wireHello } from '@sand/devices-contract'
import { needs } from '@sand/needs-you/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type SshState, sshHostsChange, sshMachines, sshState, sshStateChange } from '../contract'
import { attempts } from './attempt'
import { sshNeeds } from './needs'
import { askSheet } from './prompt'
import { sshSection } from './section'

export default definePlugin({
  name: 'devices-ssh',
  description: 'SSH hosts on the page: keeps the home PC’s SSH hosts and machines fresh, and connects or reconnects one from its section in Devices settings, lists the ones waiting on a password in Needs you and reconnects one from there, asking for passwords and host keys when the caller doesn’t',
  inject: { wire, pcs, kit },
  apply(ctx) {
    const state = sig<SshState>({ hosts: [], machines: [] })
    const set = (next: SshState) => {
      state.set(next)
      ctx.emit(sshHostsChange)
    }
    const refresh = () => ctx.wire.call(sshState, {}).then(set, error => ctx.report(error))
    ctx.effect(() => ctx.wire.on(sshStateChange, set))
    ctx.on(wireHello, () => void refresh())
    if (ctx.wire.ready()) void refresh()

    const machines = {
      hosts: () => state.get().hosts,
      machines: () => state.get().machines,
      ...attempts({ ctx, wire: ctx.wire, pcs: ctx.pcs, prompt: askSheet(ctx, ctx.kit) }),
    }
    ctx.provide(sshMachines, machines)
    ctx.watch(settings, found => found?.section({ page: 'devices', id: 'ssh', order: 10, render: () => sshSection(ctx.kit, machines, state) }))
    ctx.watch(needs, found => found?.source(sshNeeds(ctx.kit, state, machines.reconnect)))
  },
})
