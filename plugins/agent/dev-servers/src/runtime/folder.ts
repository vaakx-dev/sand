import type { Server } from 'bun'
import { realpath, stat } from 'node:fs/promises'
import { join, sep } from 'node:path'
import type { DevServer } from '../contract'

interface Served {
  server: Server<undefined>
  entry: DevServer
}

type Found = { kind: 'file'; path: string } | { kind: 'folder' }

const INDEX = 'index.html'
const ADDRESS = '127.0.0.1'

const notFound = () => new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })

const decoded = (pathname: string) => {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return undefined
  }
}

const inside = (root: string, path: string) => path === root || path.startsWith(root.endsWith(sep) ? root : root + sep)

const foundIn = async (root: string, pathname: string): Promise<Found | undefined> => {
  const wanted = decoded(pathname)
  const real = wanted === undefined ? undefined : await realpath(join(root, wanted)).catch(() => undefined)
  if (!real || !inside(root, real)) return undefined
  return (await stat(real)).isDirectory() ? { kind: 'folder' } : { kind: 'file', path: real }
}

const fileOf = (found: Found | undefined) => (found?.kind === 'file' ? new Response(Bun.file(found.path)) : notFound())

const respond = async (root: string, url: URL) => {
  const found = await foundIn(root, url.pathname)
  if (found?.kind !== 'folder') return fileOf(found)
  if (!url.pathname.endsWith('/')) return new Response(null, { status: 308, headers: { location: `${url.pathname}/${url.search}` } })
  return fileOf(await foundIn(root, url.pathname + INDEX))
}

const serveFolder = async (folder: string, session: string): Promise<Served> => {
  const root = await realpath(folder)
  if (!(await stat(root)).isDirectory()) throw new Error(`${folder} isn't a folder`)
  const server = Bun.serve({ hostname: ADDRESS, port: 0, fetch: request => respond(root, new URL(request.url)) })
  const port = server.port ?? 0
  return { server, entry: { port, url: `http://localhost:${port}`, address: ADDRESS, pid: process.pid, name: 'sand', command: root, session } }
}

class Folders {
  private readonly served = new Map<number, Served>()

  async serve(folder: string, session: string) {
    const shared = await serveFolder(folder, session)
    this.served.set(shared.entry.port, shared)
    return shared.entry
  }

  list() {
    return [...this.served.values()].map(({ entry }) => entry)
  }

  stop(port: number) {
    const shared = this.served.get(port)
    this.served.delete(port)
    shared?.server.stop(true)
    return shared !== undefined
  }

  stopAll() {
    for (const port of [...this.served.keys()]) this.stop(port)
  }
}

export { Folders }
