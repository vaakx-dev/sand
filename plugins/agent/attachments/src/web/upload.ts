import type { Wire } from '@sand/devices-contract'
import { uploadBlob } from '@sand/transfers/contract'
import { attachmentsAdd } from '../contract'

export const uploadFile = async (wire: Wire, device: string | undefined, file: File, progress: (sent: number) => void) => {
  const uploaded = await uploadBlob((path, init) => wire.fetch(path, init, device), file, progress)
  return wire.call(attachmentsAdd, { ...uploaded, name: file.name }, device)
}
