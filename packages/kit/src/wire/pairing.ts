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

const trimSlash = (base: string) => base.replace(/\/+$/, '')

export const pairLink = (base: string, secret: string) => `${trimSlash(base)}/#pair=${encodeURIComponent(secret)}`

export const installLink = (base: string, secret: string) => `${trimSlash(base)}/#install=${encodeURIComponent(secret)}`

export const pairSecret = (hash: string): string | undefined => {
  const secret = new URLSearchParams(hash.replace(/^#/, '')).get('pair')
  return secret || undefined
}

export const parsePairLink = (text: string): { url: string; secret: string } | undefined => {
  if (!URL.canParse(text.trim())) return
  const url = new URL(text.trim())
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  const secret = pairSecret(url.hash)
  return secret ? { url: url.origin, secret } : undefined
}

export const ticketSocketUrl = (base: string, ticket: string) =>
  `${trimSlash(base).replace(/^http/, 'ws')}${hostPaths.socket}?ticket=${encodeURIComponent(ticket)}`
