import type { Peers, PeerView } from '@sand/devices-contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import type { Request } from '@sand/host-hub/contract'
import type { Tool } from '@sand/tools/contract'
import { bytes } from '@sand/util'
import { resolve } from 'node:path'
import { z } from 'zod'
import { transfersOffer, transfersSave } from '../contract'
import type { TransferStore } from '../transfers'
import { offerPath } from './offer'
import { saveFrom } from './save'

export const group = 'pcs'

const copyTimeout = 60 * 60_000

const copyInput = z.object({
  from: z.string().describe('File or folder to copy; absolute on another PC'),
  to: z.string().describe('Where to put it; absolute on another PC. Files are overwritten, folders merged'),
  from_pc: z.string().optional().describe('PC that has it (default: this PC)'),
  to_pc: z.string().optional().describe('PC to copy it to (default: this PC)'),
})

const listInput = z.object({})

const reachText = (pc: PeerView) => (pc.status.phase === 'connected' ? 'reachable' : 'unreachable')

export const pcTools = (home: string, transfers: TransferStore, linked: () => Peers | undefined) => {
  const offer = offerPath(transfers)
  const save = saveFrom(transfers, linked)

  const connected = () => {
    const found = linked()
    if (!found) throw new Error("This PC can't reach your other PCs right now")
    return found
  }

  const paired = (name: string) => {
    const pcs = connected().list()
    const found = pcs.find(pc => pc.id === name || pc.name.toLowerCase() === name.toLowerCase())
    if (!found) throw new Error(`No paired PC is called ${name}. Paired PCs: ${pcs.map(pc => pc.name).join(', ') || 'none'}`)
    return found
  }

  const on = <I, O>(pc: PeerView | undefined, request: Request<I, O>, input: I, here: (input: I) => Promise<O>) =>
    pc ? connected().call(pc.id, request, input, { timeout: copyTimeout }) : here(input)

  const list: Tool<typeof listInput> = {
    name: 'list_pcs',
    description: 'List your paired PCs and whether each can be reached now.',
    group,
    input: listInput,
    async run() {
      const others = (linked()?.list() ?? []).map(pc => `${pc.name} (${pc.platform ?? 'unknown platform'}, ${reachText(pc)})`)
      return [`this PC (${process.platform})`, ...others].join('\n')
    },
  }

  const copy: Tool<typeof copyInput> = {
    name: 'copy_between_pcs',
    description: 'Copy a file or folder from one PC to another.',
    group,
    input: copyInput,
    async run({ from, to, from_pc, to_pc }, { cwd }) {
      const source = from_pc ? paired(from_pc) : undefined
      const target = to_pc ? paired(to_pc) : undefined
      const offered = await on(source, transfersOffer, { path: source ? from : resolve(cwd, from) }, offer)
      const sender = source?.id === target?.id ? undefined : (source?.id ?? (await loadPcIdentity(home)).id)
      await on(target, transfersSave, { ...offered, from: sender, path: target ? to : resolve(cwd, to) }, save)
      return `Copied ${offered.folder ? 'folder' : 'file'} (${bytes(offered.size)}) to ${to} on ${target?.name ?? 'this PC'}`
    },
  }

  return [list, copy]
}
