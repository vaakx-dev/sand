import { startRpc, type Json } from './rpc'

export interface ServerHandlers {
  notify(method: string, params: Json): void
  call(params: Json): Promise<unknown>
  exit(error: Error): void
}

const approvals = /requestApproval$|^execCommandApproval$|^applyPatchApproval$/

const answer = (handlers: ServerHandlers) => async (method: string, params: Json) => {
  if (method === 'item/tool/call') return handlers.call(params)
  if (approvals.test(method)) return { decision: 'decline' }
  throw new Error(`sand doesn't handle ${method}`)
}

export const startServer = async (binary: string, args: string[], version: string, handlers: ServerHandlers) => {
  const rpc = startRpc({ binary, args, onNotify: handlers.notify, onRequest: answer(handlers), onExit: handlers.exit })
  try {
    await rpc.request('initialize', { clientInfo: { name: 'sand', title: 'sand', version }, capabilities: { experimentalApi: true } })
  } catch (error) {
    rpc.close()
    throw error
  }
  rpc.notify('initialized')
  return rpc
}
