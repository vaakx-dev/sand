import type { Dispose } from 'drydock'
import type { HttpRoute } from '../contract'

const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/'))

export const createHttpRegistry = () => {
  const routes = new Map<string, HttpRoute[]>()

  const prefixed = (path: string) => {
    for (let parent = parentOf(path); parent; parent = parentOf(parent)) {
      const found = routes.get(parent)?.filter(route => route.prefix)
      if (found?.length) return found
    }
  }

  const route = (path: string, added: HttpRoute): Dispose => {
    const list = routes.get(path) ?? []
    if (list.some(known => known.method === added.method)) throw new Error(`${added.method} ${path} is already a host route`)
    routes.set(path, [...list, added])
    return () => {
      const rest = (routes.get(path) ?? []).filter(known => known !== added)
      if (rest.length) routes.set(path, rest)
      else routes.delete(path)
    }
  }

  return {
    get: (path: string) => routes.get(path) ?? prefixed(path),
    route,
  }
}

export type HttpRegistry = ReturnType<typeof createHttpRegistry>
