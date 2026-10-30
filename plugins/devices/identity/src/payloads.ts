export const identityProof = (clientNonce: string, serverNonce: string, pcId: string) =>
  ['sand-identity', clientNonce, serverNonce, pcId].join('\n')

export const ticketProof = (serverNonce: string, pcId: string, devicePublicKey: string) =>
  ['sand-ticket', serverNonce, pcId, devicePublicKey].join('\n')
