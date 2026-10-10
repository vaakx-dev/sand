import type { Server } from '@sand/server/contract'
import type { GithubLogin } from './login'
import { serveShare } from './share/route'

export const serveGithub = (server: Server, login: GithubLogin) => {
  const disposers = [
    server.handle('github.status', () => login.status()),
    server.handle('github.find', () => login.find()),
    server.handle('github.use', () => login.use()),
    server.handle('github.start', () => login.start()),
    server.handle('github.cancel', () => login.cancel()),
    server.handle('github.logout', () => login.logout()),
    serveShare(server, login),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
