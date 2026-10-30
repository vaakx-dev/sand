export const devicePaths = {
  identity: '/identity',
  ticket: '/ticket',
  socket: '/ws',
  pair: '/pair',
  joinRequest: '/pair/request',
  joinCancel: '/pair/request/cancel',
} as const

export const deviceParams = {
  nonce: 'nonce',
  ticket: 'ticket',
} as const

export const joinRequestPath = (id: string) => `${devicePaths.joinRequest}/${encodeURIComponent(id)}`

export const sessionHeader = (session: string) => `Bearer ${session}`
