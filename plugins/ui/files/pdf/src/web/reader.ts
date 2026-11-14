import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { bytes } from '@sand/util'
import { sniff } from './sniff'
import { pdfView } from './view'

const MAX_BYTES = 200 * 1024 * 1024

const NOT_PDF = {
  'web page': "it's a web page saved under a .pdf name, not a PDF",
  other: "it isn't a PDF",
}

const reader = async (kit: Kit, file: OpenFile) => {
  if (file.size > MAX_BYTES) throw new Error(`it's ${bytes(file.size)}, and PDFs open here up to ${bytes(MAX_BYTES)}`)
  const kind = await sniff(await file.blob())
  if (kind !== 'pdf') throw new Error(NOT_PDF[kind])
  return pdfView(kit, file)
}

export { reader }
