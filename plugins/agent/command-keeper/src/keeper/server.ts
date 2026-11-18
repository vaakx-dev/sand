import { rm, writeFile } from 'node:fs/promises'
import { createServer, type Socket } from 'node:net'
import { errorMessage } from '@sand/util'
import type { KeptCommand, Launch } from '../contract'
import { Keeper } from '../keeper'
import { type Order, type Place, readOrders, type Report, send } from '../wire'

const RESTART_WAIT_MS = 10 * 60_000

export class Server {
  readonly #place: Place
  readonly #done: () => void
  readonly #token = crypto.randomUUID()
  readonly #ended: KeptCommand[] = []
  readonly #server = createServer(socket => this.#greet(socket))
  readonly #keeper = new Keeper({
    started: command => this.#tell({ type: 'started', command }),
    output: (id, text) => this.#tell({ type: 'output', id, text }),
    exit: (last, code) => this.#exited(last, code),
  })
  #client: Socket | undefined
  #restarting = false
  #waiting: Timer | undefined

  constructor(place: Place, done: () => void) {
    this.#place = place
    this.#done = done
  }

  async listen() {
    if (process.platform !== 'win32') await rm(this.#place.path, { force: true })
    await writeFile(this.#place.tokenFile, this.#token, { mode: 0o600 })
    const listening = Promise.withResolvers<void>()
    this.#server.once('error', listening.reject)
    this.#server.listen(this.#place.path, listening.resolve)
    await listening.promise
  }

  #tell(report: Report) {
    if (this.#client) send(this.#client, report)
  }

  #greet(socket: Socket) {
    socket.on('error', () => {})
    socket.on('close', () => this.#left(socket))
    readOrders(socket, order => {
      if (socket === this.#client && order) return this.#obey(order)
      if (order?.type === 'hello' && order.token === this.#token) return this.#welcome(socket)
      socket.destroy()
    })
  }

  #welcome(socket: Socket) {
    this.#client?.destroy()
    this.#client = socket
    this.#restarting = false
    clearTimeout(this.#waiting)
    send(socket, { type: 'welcome' })
  }

  #obey(order: Order) {
    switch (order.type) {
      case 'start':
        return this.#start(order.launch)
      case 'kept':
        return this.#tell({ type: 'kept', commands: [...this.#keeper.kept(), ...this.#ended.splice(0)] })
      case 'stop':
        return void this.#keeper.stop(order.id)
      case 'hold':
        this.#restarting = true
        return
      case 'hello':
        return
    }
  }

  #start(launch: Launch) {
    try {
      this.#keeper.start(launch)
    } catch (error) {
      this.#tell({ type: 'failed', id: launch.id, error: errorMessage(error) })
    }
  }

  #exited(command: KeptCommand, code: number) {
    if (this.#client) return this.#tell({ type: 'exit', id: command.id, code })
    this.#ended.push({ ...command, code })
    this.#settle()
  }

  #left(socket: Socket) {
    if (socket !== this.#client) return
    this.#client = undefined
    if (this.#restarting) this.#waiting = setTimeout(() => void this.#quit(), RESTART_WAIT_MS)
    this.#settle()
  }

  #settle() {
    if (this.#client) return
    if (this.#restarting && (this.#keeper.holds() || this.#ended.length)) return
    void this.#quit()
  }

  async #quit() {
    this.#server.close()
    await Promise.all([this.#keeper.close(), rm(this.#place.tokenFile, { force: true })])
    this.#done()
  }
}
