import { plainArgs, sandArgs } from './args'
import { requireCodex } from './binary'
import { writeCatalog } from './catalog'
import { fieldsOf, startRpc, type Json, type Rpc } from './rpc'

export interface ThreadHandlers {
  notify(method: string, params: Json): void
  call(params: Json): Promise<unknown>
  fail(error: Error): void
}

const approvals = /requestApproval$|^execCommandApproval$|^applyPatchApproval$/

export type CodexServer = ReturnType<typeof createServer>

export const createServer = (folder: string, version: string) => {
  const threads = new Map<string, ThreadHandlers>()
  const listeners = new Set<(method: string, params: Json) => void>()
  let current: Promise<Rpc> | undefined

  const onNotify = (method: string, params: Json) => {
    if (typeof params.threadId === 'string') threads.get(params.threadId)?.notify(method, params)
    listeners.forEach(listen => listen(method, params))
  }

  const onRequest = async (method: string, params: Json) => {
    if (method === 'item/tool/call') {
      const thread = threads.get(String(params.threadId))
      if (!thread) throw new Error('This chat is no longer open in sand')
      return thread.call(params)
    }
    if (approvals.test(method)) return { decision: 'decline' }
    throw new Error(`sand doesn't handle ${method}`)
  }

  const spawn = async (binary: string, args: string[]) => {
    const rpc = startRpc({
      binary,
      args,
      onNotify,
      onRequest,
      onExit(error) {
        current = undefined
        threads.forEach(thread => thread.fail(error))
      },
    })
    await rpc.request('initialize', { clientInfo: { name: 'sand', title: 'sand', version }, capabilities: { experimentalApi: true } })
    rpc.notify('initialized')
    return rpc
  }

  const userServers = async (rpc: Rpc) => {
    const { config } = await rpc.request('config/read', {})
    await rpc.request('model/list', {})
    return Object.keys(fieldsOf(fieldsOf(config).mcp_servers))
  }

  const boot = async () => {
    const binary = await requireCodex()
    const plain = await spawn(binary, plainArgs)
    const mcpServers = await userServers(plain).finally(() => plain.close())
    return spawn(binary, sandArgs({ catalog: await writeCatalog(folder), mcpServers }))
  }

  const rpc = () =>
    (current ??= boot().catch(error => {
      current = undefined
      throw error
    }))

  return {
    request: async (method: string, params: Json = {}) => (await rpc()).request(method, params),
    thread(id: string, handlers: ThreadHandlers) {
      threads.set(id, handlers)
      return () => threads.delete(id)
    },
    listen(listener: (method: string, params: Json) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    close() {
      void current?.then(found => found.close(), () => {})
      current = undefined
    },
  }
}
