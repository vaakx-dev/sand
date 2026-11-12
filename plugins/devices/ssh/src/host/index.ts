import { peerRoutes, peers as peersService, registry as registryService, thisPc as thisPcService } from '@sand/devices-contract'
import { notify } from '@sand/devices-notify/contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hostHttp } from '@sand/host-gateway/contract'
import { hub as hubService } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type SshMachine, type SshState, sshStateChange } from '../contract'
import { openBridge } from './askpass/bridge'
import { askpassProgram } from './askpass/program'
import { createHostList } from './hosts/list'
import { createFleet } from './machines/fleet'
import { createMachines } from './machines/machines'
import { openSecrets } from './machines/secrets'
import { type Machine, openStore } from './machines/store'
import { sshRequests } from './requests'
import { createSsh } from './ssh/run'

export default definePlugin({
  name: 'devices-ssh',
  description: 'Adds machines you reach over SSH as your PCs, installing sand on them when missing, and keeps an SSH tunnel to each one',
  inject: { hostOptions, hostHttp, hub: hubService, registry: registryService, thisPc: thisPcService, peers: peersService },
  async apply(ctx) {
    const { hub, registry, thisPc, peers } = ctx
    const home = ctx.hostOptions.home
    const bridge = openBridge(await askpassProgram(join(home, 'ssh')))
    ctx.effect(() => bridge.stop)
    const ssh = createSsh(bridge)
    const store = await openStore(home)
    const secrets = await openSecrets(home)
    const localPort = () => ctx.hostHttp.port()

    const view = (machine: Machine): SshMachine => ({
      pc: machine.pc,
      name: registry.get(machine.pc)?.name ?? machine.name,
      target: machine.target,
      ...fleet.status(machine.pc),
    })
    const state = (): SshState => {
      const machines = store.list()
      const taken = new Set(machines.map(machine => machine.host))
      return { hosts: hosts.hosts().filter(host => !taken.has(host.id)), machines: machines.map(view) }
    }
    const changed = () => hub.broadcast(sshStateChange, state(), 'user')

    const needsYou = (pc: string, error: string) =>
      void ctx
        .get(notify)
        ?.send({ kind: 'needs', title: registry.get(pc)?.name ?? store.get(pc)?.name ?? 'SSH machine', text: `Needs your password or host key to connect: ${error}` })
        .catch(failure => ctx.report(failure))
    const fleet = createFleet({ ssh, store, secrets, localPort, routes: () => ctx.get(peerRoutes), changed, needsYou })
    ctx.effect(() => fleet.stop)
    const hosts = createHostList(join(homedir(), '.ssh'), ssh, changed)
    ctx.effect(() => hosts.stop)

    const paired = (machine: Machine) => {
      const record = registry.get(machine.pc)
      return Boolean(record && !record.removed)
    }
    const forgetRemoved = () => {
      const removed = store.list().filter(machine => !paired(machine))
      Promise.all(removed.map(machine => fleet.remove(machine.pc)))
        .catch(error => ctx.report(error))
        .finally(changed)
    }
    ctx.effect(() => registry.onChange(forgetRemoved))
    forgetRemoved()
    for (const machine of store.list().filter(paired)) fleet.start(machine.pc)

    const machines = createMachines({ ssh, hub, registry, thisPc, localPort, fleet, store, secrets, peers, changed })
    const service = {
      state: async () => {
        await hosts.ready()
        return state()
      },
      ...machines,
    }
    for (const register of sshRequests(hub, service)) ctx.effect(register)
  },
})
