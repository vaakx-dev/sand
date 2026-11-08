import { pcs, wire, wireHello } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { type SshState, sshHostsChange, sshMachines, sshState, sshStateChange } from '../contract'
import { attempts } from './attempt'
import { askSheet } from './prompt'

export default definePlugin({
  name: 'devices-ssh',
  description: 'SSH hosts on the page: keeps the home PC’s SSH hosts and machines fresh, and connects or reconnects one, asking for passwords and host keys when the caller doesn’t',
  inject: { wire, pcs, kit },
  apply(ctx) {
    let state: SshState = { hosts: [], machines: [] }
    const set = (next: SshState) => {
      state = next
      ctx.emit(sshHostsChange)
    }
    const refresh = () => ctx.wire.call(sshState, {}).then(set, error => ctx.report(error))
    ctx.effect(() => ctx.wire.on(sshStateChange, set))
    ctx.on(wireHello, () => void refresh())
    if (ctx.wire.ready()) void refresh()

    ctx.provide(sshMachines, {
      hosts: () => state.hosts,
      machines: () => state.machines,
      ...attempts({ ctx, wire: ctx.wire, pcs: ctx.pcs, prompt: askSheet(ctx, ctx.kit) }),
    })
  },
})
