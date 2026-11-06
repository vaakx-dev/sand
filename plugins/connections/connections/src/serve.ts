import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import {
  connectionCancel,
  connectionClient,
  connectionRemove,
  connectionSave,
  connectionsChange,
  connectionStart,
  connectionState,
  connectionsWire,
} from './contract'
import type { ConnectionsRuntime } from './service'

export const serveConnections = (ctx: Context, runtime: ConnectionsRuntime) =>
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(connectionState, () => runtime.state()),
      found.handle(connectionClient, ({ kind, id, secret }) => runtime.setClient(kind, { id, ...(secret && { secret }) })),
      found.handle(connectionStart, ({ kind, readOnly }) => runtime.start(kind, !!readOnly)),
      found.handle(connectionCancel, ({ flow }) => runtime.cancel(flow)),
      found.handle(connectionSave, ({ kind, values }) => runtime.saveForm(kind, values)),
      found.handle(connectionRemove, ({ account }) => runtime.service.disconnect(account).then(runtime.state)),
      ctx.on(connectionsChange, () => found.broadcast(connectionsWire, runtime.state())),
    )
  })
