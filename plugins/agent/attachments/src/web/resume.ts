import { keyval } from '@sand/keyval'
import { TRANSFER_LIFETIME_MS, type Resumable } from '@sand/transfers/contract'

interface Kept {
  transfer: string
  arrived: number[]
  at: number
}

const kept = keyval<Kept>('sand-uploads', 'transfers')

const keyOf = (file: File, device: string | undefined) => [device ?? '', file.name, file.size, file.lastModified].join('|')

const fresh = ({ at }: Kept) => Date.now() - at < TRANSFER_LIFETIME_MS

export const forgetUpload = (file: File, device: string | undefined) => void kept.remove(keyOf(file, device)).catch(() => {})

export const keepUpload = (file: File, device: string | undefined, { transfer, arrived }: Resumable) =>
  void kept.put(keyOf(file, device), { transfer, arrived: [...arrived], at: Date.now() }).catch(() => {})

export const resumeUpload = async (file: File, device: string | undefined, into: Resumable) => {
  const found = await kept.get(keyOf(file, device)).catch(() => undefined)
  if (!found) return
  if (!fresh(found)) return forgetUpload(file, device)
  into.transfer = found.transfer
  for (const index of found.arrived) into.arrived.add(index)
}
