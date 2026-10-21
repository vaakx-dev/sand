import { trimSlash } from '../../text/url'

export const hostPaths = {
  identity: '/identity',
  pair: '/pair',
  invite: '/pair/create',
  pairLink: '/pair/link',
  ticket: '/ticket',
  unpair: '/unpair',
  health: '/health',
  stop: '/stop',
  socket: '/ws',
  installPlugins: '/install/plugins',
  installPair: '/install/pair',
  installStep: '/install/step',
  installDone: '/install/done',
  installFail: '/install/fail',
} as const

export const ticketSocketUrl = (base: string, ticket: string) =>
  `${trimSlash(base).replace(/^http/, 'ws')}${hostPaths.socket}?ticket=${encodeURIComponent(ticket)}`
