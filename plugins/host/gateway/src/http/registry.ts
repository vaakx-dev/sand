import type { HttpRoute } from '../contract'
import type { Dispose } from 'drydock'

export const createHttpRegistry = () => {
  const routes = new Map<string, HttpRoute>()
  return {
    get: (path: string) => routes.get(path),
    route(path: string, route: HttpRoute): Dispose {
      if (routes.has(path)) throw new Error(`${path} is already a host route`)
      routes.set(path, route)
      return () => {
        if (routes.get(path) === route) routes.delete(path)
      }
    },
  }
}

export type HttpRegistry = ReturnType<typeof createHttpRegistry>
