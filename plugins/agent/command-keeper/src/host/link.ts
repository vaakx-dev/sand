import { readFile } from 'node:fs/promises'
import { connect, type Socket } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { CommandHooks, KeptCommand, Launch } from '../contract'
import { type Place, placeOf, readReports, type Report, send } from '../wire'

const KEEPER_MAIN = join(import.meta.dir, '..', 'keeper', 'main.ts')
const LOST_CODE = -1

const tokenOf = (place: Place) => readFile(place.tokenFile, 'utf8').catch(() => undefined)

const firstLine = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  const { value } = await reader.read()
  await reader.cancel()
  return new TextDecoder().decode(value).trim()
}

const launchKeeper = async (home: string) => {
  const keeper = Bun.spawn([process.execPath, KEEPER_MAIN, home], {
    cwd: homedir(),
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'inherit',
    detached: true,
    windowsHide: true,
  })
  keeper.unref()
  if ((await firstLine(keeper.stdout)) !== 'ready') throw new Error(`sand couldn't start the keeper of background commands (exit code ${await keeper.exited})`)
}

const knock = (path: string, token: string, take: (report: Report) => void) =>
  new Promise<Socket | undefined>(resolve => {
    const socket = connect(path, () => send(socket, { type: 'hello', token }))
    const refused = () => resolve(undefined)
    socket.once('error', refused)
    socket.once('close', refused)
    readReports(socket, report => {
      if (report?.type !== 'welcome') return report && take(report)
      socket.off('error', refused)
      socket.off('close', refused)
      socket.on('error', () => {})
      resolve(socket)
    })
  })

export class Link {
  readonly #home: string
  readonly #place: Place
  readonly #hooks: CommandHooks
  readonly #running = new Set<string>()
  readonly #starting = new Map<string, PromiseWithResolvers<number>>()
  readonly #listing: PromiseWithResolvers<KeptCommand[]>[] = []
  #connection: Promise<Socket | undefined> | undefined
  #socket: Socket | undefined

  constructor(home: string, hooks: CommandHooks) {
    this.#home = home
    this.#place = placeOf(home)
    this.#hooks = hooks
  }

  async start(launch: Launch) {
    const started = Promise.withResolvers<number>()
    this.#starting.set(launch.id, started)
    const socket = await this.#ensured().catch((error: unknown) => {
      this.#starting.delete(launch.id)
      throw error
    })
    send(socket, { type: 'start', launch })
    return started.promise
  }

  async kept() {
    const socket = await this.#connected()
    if (!socket) return []
    const listed = Promise.withResolvers<KeptCommand[]>()
    this.#listing.push(listed)
    send(socket, { type: 'kept' })
    return listed.promise
  }

  stop(id: string) {
    if (this.#socket && this.#running.has(id)) send(this.#socket, { type: 'stop', id })
  }

  hold() {
    if (this.#socket) send(this.#socket, { type: 'hold' })
  }

  close() {
    const socket = this.#socket
    this.#forget()
    socket?.end()
  }

  #connected() {
    this.#connection ??= this.#dial()
    return this.#connection
  }

  async #ensured() {
    const socket = await this.#connected()
    if (socket) return socket
    this.#connection ??= launchKeeper(this.#home).then(() => this.#dial())
    const launched = await this.#connection
    if (!launched) throw new Error("sand couldn't reach the keeper of background commands")
    return launched
  }

  async #dial() {
    const token = await tokenOf(this.#place)
    const socket = token === undefined ? undefined : await knock(this.#place.path, token, report => this.#take(report))
    if (!socket) {
      this.#connection = undefined
      return undefined
    }
    this.#socket = socket
    socket.on('close', () => this.#lost(socket))
    return socket
  }

  #take(report: Report) {
    switch (report.type) {
      case 'started':
        return this.#started(report.command)
      case 'failed':
        return this.#failed(report.id, report.error)
      case 'output':
        return this.#hooks.output(report.id, report.text)
      case 'exit':
        return this.#exited(report.id, report.code)
      case 'kept':
        return this.#listed(report.commands)
      case 'welcome':
        return
    }
  }

  #started(command: KeptCommand) {
    this.#running.add(command.id)
    this.#starting.get(command.id)?.resolve(command.pid)
    this.#starting.delete(command.id)
    this.#hooks.started(command)
  }

  #failed(id: string, error: string) {
    this.#starting.get(id)?.reject(new Error(error))
    this.#starting.delete(id)
    this.#closeIdle()
  }

  #exited(id: string, code: number) {
    this.#running.delete(id)
    this.#hooks.exit(id, code)
    this.#closeIdle()
  }

  #listed(commands: KeptCommand[]) {
    for (const command of commands) if (command.code === undefined) this.#running.add(command.id)
    this.#listing.shift()?.resolve(commands)
    this.#closeIdle()
  }

  #closeIdle() {
    if (this.#running.size || this.#starting.size || this.#listing.length) return
    this.close()
  }

  #lost(socket: Socket) {
    if (socket !== this.#socket) return
    const running = [...this.#running]
    const lost = new Error('the keeper of background commands stopped')
    for (const started of this.#starting.values()) started.reject(lost)
    for (const listed of this.#listing) listed.resolve([])
    this.#forget()
    for (const id of running) this.#hooks.exit(id, LOST_CODE)
  }

  #forget() {
    this.#socket = undefined
    this.#connection = undefined
    this.#running.clear()
    this.#starting.clear()
    this.#listing.length = 0
  }
}
