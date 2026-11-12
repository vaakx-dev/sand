import { pcNamed, type Peers, type PeerView, reachablePeers } from '@sand/devices-contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import type { Request } from '@sand/host-hub/contract'
import { type Copied, type CopyInput, type OfferedPath, type OfferInput, type SaveInput, transfersOffer, transfersSave } from '../contract'

interface CopyDeps {
  home: string
  linked: () => Peers | undefined
  offer: (input: OfferInput) => Promise<OfferedPath>
  save: (input: SaveInput) => Promise<void>
}

const copyTimeoutMs = 60 * 60_000

export const copyBetween = ({ home, linked, offer, save }: CopyDeps) => {
  const named = (name: string | undefined) => (name ? pcNamed(linked(), name) : undefined)

  const on = <I, O>(pc: PeerView | undefined, request: Request<I, O>, input: I, here: (input: I) => Promise<O>) =>
    pc ? reachablePeers(linked()).call(pc.id, request, input, { timeout: copyTimeoutMs }) : here(input)

  return async ({ from, to, fromPc, toPc, files }: CopyInput): Promise<Copied> => {
    const source = named(fromPc)
    const target = named(toPc)
    const offered = await on(source, transfersOffer, { path: from, ...(files && { files }) }, offer)
    const sender = source?.id === target?.id ? undefined : (source?.id ?? (await loadPcIdentity(home)).id)
    await on(target, transfersSave, { ...offered, from: sender, path: to }, save)
    return { folder: offered.folder, size: offered.size, to, pc: target?.name }
  }
}
