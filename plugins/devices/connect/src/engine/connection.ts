import type { CallOptions, Connect, PcConnection } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import { routeBook } from '../routes/book'
import { callTimeout } from '../timing'
import { attemptLog } from './attempts'
import { sessionOf } from './hello'
import { authedInit } from './http'
import { lifecycle } from './lifecycle'

export const connect: Connect = options => {
  const book = routeBook(options.target.id, options.seeds, options.store)
  const attempts = attemptLog()
  const life = lifecycle(options, book, attempts)

  const routesChanged = () => {
    options.changed()
    life.woke()
  }

  const connection: PcConnection = {
    pc: options.target.id,
    status: life.status,
    diagnosis: () => ({ status: life.status(), routes: book.entries(options.secure), attempts: attempts.list() }),
    identity: life.identity,
    tag: life.tag,
    call<I, O>(request: Request<I, O>, input: I, call?: CallOptions) {
      const active = life.active()
      if (!active) return Promise.reject(life.unavailable())
      return active.opened.link.call(request, input, call?.timeout ?? callTimeout)
    },
    async fetch(path, init, call) {
      const active = life.active()
      if (!active) throw life.unavailable()
      const session = sessionOf(active.opened.hello)
      if (!session) throw new Error(`${life.name()} didn't give this device an HTTP session`)
      return active.opened.link.transport.fetch(path, authedInit(init, session, call?.timeout ?? callTimeout))
    },
    retry: life.woke,
    setPrefs(prefs) {
      book.setPrefs(prefs)
      routesChanged()
    },
    addRoute(url) {
      book.add(url)
      routesChanged()
    },
    removeRoute(key) {
      if (book.remove(key)) routesChanged()
    },
    close: life.close,
  }

  life.start()
  return connection
}
