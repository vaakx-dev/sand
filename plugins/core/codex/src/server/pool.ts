import type { Json, Rpc } from '@sand/app-plan'
import { plainArgs, sandArgs } from './args'
import { codex } from './binary'
import { writeCatalog } from './catalog'
import { unwantedFeatures } from './features'
import { type Launch, type ServerHandlers, startServer } from './server'

type Listener = (method: string, params: Json) => void

interface Member {
  exit(error: Error): void
  busy: boolean
  used: number
}

export interface ThreadServer {
  pid: number
  request(method: string, params?: Json): Promise<Json>
  close(): Promise<void>
}

const live = 4

const unhandled = (params: Json) => Promise.reject(new Error(`No sand chat runs Codex thread ${String(params.threadId)} here`))

export type Pool = ReturnType<typeof createPool>

export interface CodexPlace {
  folder: string
  home: string
}

export const createPool = ({ folder, home }: CodexPlace, version: string) => {
  const listeners = new Set<Listener>()
  const members = new Map<Member, Rpc>()
  let launch: Promise<Launch> | undefined
  let control: Promise<Rpc> | undefined

  const broadcast: Listener = (method, params) => listeners.forEach(listen => listen(method, params))

  const survey = async () => {
    const binary = await codex.require()
    const plain = await startServer({ binary, args: plainArgs, home }, version, { notify() {}, call: unhandled, exit() {} })
    const features = await plain
      .request('model/list', {})
      .then(() => unwantedFeatures(plain))
      .finally(() => plain.close())
    return { binary, home, args: sandArgs({ catalog: await writeCatalog(folder, home), features }) }
  }

  const surveyed = () =>
    (launch ??= survey().catch(error => {
      launch = undefined
      throw error
    }))

  const spawn = async (handlers: ServerHandlers) => startServer(await surveyed(), version, handlers)

  const controlRpc = () =>
    (control ??= spawn({ notify: broadcast, call: unhandled, exit: () => (control = undefined) }).catch(error => {
      control = undefined
      throw error
    }))

  const makeRoom = () => {
    if (members.size < live) return
    const idle = [...members].filter(([member]) => !member.busy).sort(([a], [b]) => a.used - b.used)[0]
    if (!idle) return
    const [member, rpc] = idle
    members.delete(member)
    member.exit(new Error('Codex closed this idle thread to make room for another'))
    rpc.close()
  }

  const open = async (handlers: ServerHandlers): Promise<ThreadServer> => {
    makeRoom()
    const member: Member = { exit: handlers.exit, busy: false, used: Date.now() }
    const rpc = await spawn({
      notify(method, params) {
        member.used = Date.now()
        if (method === 'turn/completed') member.busy = false
        broadcast(method, params)
        handlers.notify(method, params)
      },
      call: handlers.call,
      exit(error) {
        members.delete(member)
        handlers.exit(error)
      },
    })
    members.set(member, rpc)
    return {
      pid: rpc.pid,
      request(method, params = {}) {
        member.used = Date.now()
        if (method === 'turn/start') member.busy = true
        return rpc.request(method, params)
      },
      close() {
        members.delete(member)
        return rpc.close()
      },
    }
  }

  return {
    request: async (method: string, params: Json = {}) => (await controlRpc()).request(method, params),
    open,
    listen(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    close() {
      void control?.then(rpc => rpc.close(), () => {})
      control = undefined
      members.forEach(rpc => rpc.close())
      members.clear()
    },
  }
}
