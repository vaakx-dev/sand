import type { IdentityReply } from '@sand/devices-contract'

export const createProofs = () => {
  const bySocket = new WeakMap<object, IdentityReply>()
  return {
    attach(socket: object, proof: IdentityReply | undefined) {
      if (proof) bySocket.set(socket, proof)
    },
    of: (socket: object) => bySocket.get(socket),
  }
}

export type Proofs = ReturnType<typeof createProofs>
