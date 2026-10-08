import type { Server } from '@sand/protocol'
import { iconRoute, iconVersion } from './icon'
import type { ProjectLibrary } from './library'

const throttled = (send: (text: string) => void, ms = 150) => {
  let last = 0
  return (text: string) => {
    const now = Date.now()
    if (now - last < ms) return
    last = now
    send(text)
  }
}

export const serveProjects = (server: Server, library: ProjectLibrary) => {
  const disposers = [
    server.handle('projects.list', () => library.list()),
    server.handle('projects.icon', ({ path }) => iconVersion(path)),
    server.handle('projects.add', ({ path, link }) => library.add(path, link)),
    server.handle('projects.update', ({ path, patch }) => library.update(path, patch)),
    server.handle('projects.remove', ({ path }) => library.remove(path)),
    server.handle('projects.root', ({ root }) => library.setRoot(root)),
    server.handle('projects.create', ({ name }) => library.create(name)),
    server.handle('projects.clone', ({ url, into, job = '' }) =>
      library.clone(url, into, throttled(text => server.broadcast('projects.progress', [{ job, text }]))),
    ),
    server.route('/project-icon', iconRoute),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
