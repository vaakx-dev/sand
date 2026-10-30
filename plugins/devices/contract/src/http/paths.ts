export const devicePaths = {
  identity: '/identity',
  ticket: '/ticket',
  socket: '/ws',
  pair: '/pair',
  joinRequest: '/pair/request',
  joinCancel: '/pair/request/cancel',
  via: '/via',
} as const

export const deviceParams = {
  nonce: 'nonce',
  ticket: 'ticket',
} as const

export const joinRequestPath = (id: string) => `${devicePaths.joinRequest}/${encodeURIComponent(id)}`

export const viaPath = (pc: string, path: string) => `${devicePaths.via}/${encodeURIComponent(pc)}${path}`

export const sessionHeader = (session: string) => `Bearer ${session}`
