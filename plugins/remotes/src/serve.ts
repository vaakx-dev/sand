import type { Remotes, Server } from '@sand/protocol'

export const serveRemotes = (server: Server, remotes: Remotes) => {
  const disposers = [
    server.handle('device.info', () => remotes.device()),
    server.handle('remotes.list', () => remotes.list()),
    server.handle('remotes.add', ({ link }) => remotes.add(link)),
    server.handle('remotes.remove', ({ id }) => remotes.remove(id)),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
