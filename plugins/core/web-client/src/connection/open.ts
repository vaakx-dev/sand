import type { Hello, WireEvent, WireRequestOf } from '@sand/protocol'
import { connect, type Connection } from '../wire/connection'
import type { Route } from './select'
import { within } from './timeout'

export interface Slot {
  connection: Connection
}

export interface Opened {
  slot: Slot
  hello: Hello
  route: Route
  id: string
}

export interface SlotHandlers {
  event(slot: Slot, event: WireEvent): void
  close(slot: Slot): void
  greeting(): WireRequestOf<'hello'>
}

const openWait = 10_000

export const openRoute = async (
  route: Route,
  id: string,
  ticket: (base: string, host: string) => Promise<string>,
  handlers: SlotHandlers,
): Promise<Opened> => {
  const url = await ticket(route.url, id)
  let slot: Slot | undefined
  const connection = await within(
    connect(url, {
      event: event => slot && handlers.event(slot, event),
      close: () => slot && handlers.close(slot),
    }),
    openWait,
    `${route.url} did not open a connection`,
    late => late.close(),
  )
  const opened: Slot = { connection }
  slot = opened
  try {
    const hello = await within(connection.call<Hello>(handlers.greeting()), openWait, `${route.url} did not say hello`)
    return { slot: opened, hello, route, id }
  } catch (error) {
    connection.close()
    throw error
  }
}
