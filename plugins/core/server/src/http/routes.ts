import type { RouteHandler, RouteOptions } from '../contract'

export const createRoutes = () => {
  const routes = new Map<string, RouteHandler>()
  const open = new Set<RouteHandler>()

  const route = (path: string, handler: RouteHandler, options?: RouteOptions) => {
    routes.set(path, handler)
    if (options?.public) open.add(handler)
    return () => {
      open.delete(handler)
      if (routes.get(path) === handler) routes.delete(path)
    }
  }

  const find = (path: string) => routes.get(path)

  return { route, find, isPublic: (handler: RouteHandler) => open.has(handler) }
}

export type Routes = ReturnType<typeof createRoutes>
