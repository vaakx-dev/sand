import { helloRoutes, helloSession } from '@sand/devices-contract'
import type { Hello, HelloField } from '@sand/host-hub/contract'
import { isPublishedRoutes } from '../routes/valid'

const helloValue = <T>(reply: Hello, field: HelloField<T>): unknown => reply.fresh[field.id] ?? reply.shared?.[field.id]

export const sessionOf = (reply: Hello) => {
  const session = helloValue(reply, helloSession)
  return typeof session === 'string' ? session : undefined
}

export const publishedOf = (reply: Hello) => {
  const routes = helloValue(reply, helloRoutes)
  return isPublishedRoutes(routes) ? routes : undefined
}
