import type { Request } from '@sand/host-hub/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import { callPeer, remoteStore } from '@sand/host-remotes/peers'
import type { Tool } from '@sand/tools/contract'
import { bytes } from '@sand/util'
import { readDeviceId } from '@sand/util/boot'
import { resolve } from 'node:path'
import { z } from 'zod'
import { transfersOffer, transfersSave } from '../contract'
import { reachableUrl } from '../pull'
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

export const pcTools = (home: string, transfers: TransferStore) => {
  const offer = offerPath(transfers)
  const save = saveFrom(home, transfers)

  const paired = async (name: string) => {
    const records = (await remoteStore(home)).list()
    const found = records.find(record => record.id === name || record.name.toLowerCase() === name.toLowerCase())
    if (!found) throw new Error(`No paired PC is called ${name}. Paired PCs: ${records.map(record => record.name).join(', ') || 'none'}`)
    return found
  }

  const on = <I, O>(pc: RemoteRecord | undefined, request: Request<I, O>, input: I, here: (input: I) => Promise<O>) =>
    pc ? callPeer(pc, request, input, new Set(), copyTimeout) : here(input)

  const list: Tool<typeof listInput> = {
    name: 'list_pcs',
    description: 'List your paired PCs and whether each can be reached now.',
    group,
    input: listInput,
    async run() {
      const reach = (record: RemoteRecord) => reachableUrl(record).then(() => 'reachable', () => 'unreachable')
      const others = await Promise.all((await remoteStore(home)).list().map(async record => `${record.name} (${record.platform}, ${await reach(record)})`))
      return [`this PC (${process.platform})`, ...others].join('\n')
    },
  }

  const copy: Tool<typeof copyInput> = {
    name: 'copy_between_pcs',
    description: 'Copy a file or folder from one PC to another.',
    group,
    input: copyInput,
    async run({ from, to, from_pc, to_pc }, { cwd }) {
      const source = from_pc ? await paired(from_pc) : undefined
      const target = to_pc ? await paired(to_pc) : undefined
      const offered = await on(source, transfersOffer, { path: source ? from : resolve(cwd, from) }, offer)
      const sender = source?.id === target?.id ? undefined : (source?.id ?? (await readDeviceId(home)))
      await on(target, transfersSave, { ...offered, from: sender, path: target ? to : resolve(cwd, to) }, save)
      return `Copied ${offered.folder ? 'folder' : 'file'} (${bytes(offered.size)}) to ${to} on ${target?.name ?? 'this PC'}`
    },
  }

  return [list, copy]
}
