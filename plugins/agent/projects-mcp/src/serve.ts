import { findPc, noSuchPc, type Peers } from '@sand/devices-contract'
import type { Caller, Request } from '@sand/host-hub/contract'
import type { HostChannel } from '@sand/host-runtimes/contract'
import { runtimeProjectCreate, runtimeProjectRemove, runtimeProjectRoot, runtimeProjectRow, runtimeProjectRows, runtimeProjectUpdate } from '@sand/project/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { projectCreate, projectRemove, projectRoot, projectRows, projectUpdate } from './contract'

const elsewhere = (pc: string | undefined, caller: Caller): pc is string => pc !== undefined && caller.kind !== 'pc'

export const serveProjects = (server: Server, host: HostChannel, linked: () => Peers | undefined) => {
  const onPc = <I, O>(name: string, request: Request<I, O>, input: I) => {
    const found = linked()
    if (!found) throw new Error("This PC can't reach your other PCs right now")
    const pcs = found.list()
    const target = findPc(pcs, name)
    if (!target) throw new Error(noSuchPc(pcs, name))
    return found.call(target.id, request, input)
  }

  return joinDisposers(
    server.handle(projectRows, () => host.call(runtimeProjectRows, {})),
    server.handle(projectCreate, async ({ pc, ...input }, caller) => {
      if (!elsewhere(pc, caller)) return host.call(runtimeProjectCreate, input)
      const { project, sameRemote } = await onPc(pc, projectCreate, input)
      const row = await host.call(runtimeProjectRow, { project })
      return { ...row, ...(sameRemote && { sameRemote }) }
    }),
    server.handle(projectUpdate, input => host.call(runtimeProjectUpdate, input)),
    server.handle(projectRemove, input => host.call(runtimeProjectRemove, input)),
    server.handle(projectRoot, ({ pc, ...input }, caller) => (elsewhere(pc, caller) ? onPc(pc, projectRoot, input) : host.call(runtimeProjectRoot, input))),
  )
}
