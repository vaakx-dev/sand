import type { FileBlock } from '@sand/messages'
import { uploadBlob } from '@sand/kit/transfers'
import type { Wire } from '@sand/web-client/contract'

export const uploadFile = async (wire: Wire, device: string | undefined, file: File, progress: (sent: number) => void) => {
  const uploaded = await uploadBlob((path, init) => wire.fetch(path, init, device), file, progress)
  return wire.call<FileBlock>({ type: 'attachments.finish', ...uploaded, name: file.name }, device)
}
