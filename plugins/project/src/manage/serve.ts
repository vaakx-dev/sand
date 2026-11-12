import { pcNamed, type Peers, reachablePeers } from '@sand/devices-contract'
import type { Caller, Request } from '@sand/host-hub/contract'
import type { HostChannel } from '@sand/host-runtimes/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import {
  projectCreate,
  projectRemove,
  projectRoot,
  projectRows,
  projectUpdate,
  runtimeProjectCreate,
  runtimeProjectRemove,
  runtimeProjectRoot,
  runtimeProjectRow,
  runtimeProjectRows,
  runtimeProjectUpdate,
} from '../contract'

const elsewhere = (pc: string | undefined, caller: Caller): pc is string => pc !== undefined && caller.kind !== 'pc'

interface ServeDeps {
  host: () => HostChannel | undefined
  linked: () => Peers | undefined
}

export const serveProjects = (server: Server, { host: linkedHost, linked }: ServeDeps) => {
  const host = () => {
    const found = linkedHost()
    if (!found) throw new Error("Managing projects needs sand's host, which isn't running")
    return found
  }

  const onPc = <I, O>(name: string, request: Request<I, O>, input: I) => reachablePeers(linked()).call(pcNamed(linked(), name).id, request, input)

  return joinDisposers(
    server.handle(projectRows, () => host().call(runtimeProjectRows, {})),
    server.handle(projectCreate, async ({ pc, ...input }, caller) => {
      if (!elsewhere(pc, caller)) return host().call(runtimeProjectCreate, input)
      const { project, sameRemote } = await onPc(pc, projectCreate, input)
      const row = await host().call(runtimeProjectRow, { project })
      return { ...row, ...(sameRemote && { sameRemote }) }
    }),
    server.handle(projectUpdate, input => host().call(runtimeProjectUpdate, input)),
    server.handle(projectRemove, input => host().call(runtimeProjectRemove, input)),
    server.handle(projectRoot, ({ pc, ...input }, caller) => (elsewhere(pc, caller) ? onPc(pc, projectRoot, input) : host().call(runtimeProjectRoot, input))),
  )
}
