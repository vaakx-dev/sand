import { type Hello, hello, type InputOf } from '@sand/host-hub/contract'
import { connect, type Connection, type Heard } from '../integrations/socket'
import type { Route } from './select'
import { within } from './timeout'

export interface Opened {
  connection: Connection
  hello: Hello
  route: Route
  id: string
}

export interface ConnectionHandlers {
  event(connection: Connection, heard: Heard): void
  close(connection: Connection): void
  greeting(): InputOf<typeof hello>
}

const openWait = 15_000
const helloWait = 30_000

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
    const greeted = await within(connection.call(hello, handlers.greeting()), helloWait, `${route.url} did not say hello`)
    return { connection, hello: greeted, route, id }
  } catch (error) {
    connection.close()
    throw error
  }
}
