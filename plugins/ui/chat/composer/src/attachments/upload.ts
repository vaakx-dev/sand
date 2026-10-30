import { attachmentsFinish } from '@sand/attachments/contract'
import type { Wire } from '@sand/devices-contract'
import { uploadBlob } from '@sand/transfers/client'

export const uploadFile = async (wire: Wire, device: string, file: File, progress: (sent: number) => void) => {
  const uploaded = await uploadBlob((path, init) => wire.fetch(path, init, device), file, progress)
  return wire.call(attachmentsFinish, { ...uploaded, name: file.name }, device)
}
