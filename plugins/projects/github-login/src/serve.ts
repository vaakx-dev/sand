import { joinDisposers } from '@sand/kit'
import type { Server } from '@sand/server/contract'
import type { GithubLogin } from './login'
import { serveShare } from './share/route'

export const serveGithub = (server: Server, login: GithubLogin) =>
  joinDisposers(
    server.handle({
      'github.status': () => login.status(),
      'github.find': () => login.find(),
      'github.use': () => login.use(),
      'github.start': () => login.start(),
      'github.cancel': () => login.cancel(),
      'github.logout': () => login.logout(),
    }),
    serveShare(server, login),
  )
