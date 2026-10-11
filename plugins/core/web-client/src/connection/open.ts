import type { Hello, WireEvent, WireRequestOf } from '@sand/protocol'
import { connect, type Connection } from '../integrations/socket'
import type { Route } from './select'
import { within } from './timeout'

export interface Opened {
  connection: Connection
  hello: Hello
  route: Route
  id: string
}

export interface ConnectionHandlers {
  event(connection: Connection, event: WireEvent): void
  close(connection: Connection): void
  greeting(): WireRequestOf<'hello'>
}

const openWait = 10_000

export const openRoute = async (
  route: Route,
  id: string,
  ticket: (base: string, host: string) => Promise<string>,
  handlers: ConnectionHandlers,
): Promise<Opened> => {
  const url = await ticket(route.url, id)
  let opened: Connection | undefined
  const connection = await within(
    connect(url, {
      event: event => opened && handlers.event(opened, event),
      close: () => opened && handlers.close(opened),
    }),
    openWait,
    `${route.url} did not open a connection`,
    late => late.close(),
  )
  opened = connection
  try {
    const hello = await within(connection.call<Hello>(handlers.greeting()), openWait, `${route.url} did not say hello`)
    return { connection, hello, route, id }
  } catch (error) {
    connection.close()
    throw error
  }
}
