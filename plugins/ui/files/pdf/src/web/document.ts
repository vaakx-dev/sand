import type { OpenFile } from '@sand/file-viewer/contract'
import { errorMessage, libraryRoot } from '@sand/util'
import { getDocument, GlobalWorkerOptions, PasswordException, type PDFDocumentLoadingTask, type PDFDocumentProxy, version } from 'pdfjs-dist'
import { pdfAssetsRoute } from '../contract'

interface Opened {
  document: PDFDocumentProxy
  shape: number
}

interface Opening {
  opened: Promise<Opened>
  close(): void
}

const ASSETS = libraryRoot(pdfAssetsRoute, version)

const MAX_IMAGE_BYTES = 32 * 1024 * 1024

GlobalWorkerOptions.workerSrc = `${ASSETS}build/pdf.worker.min.mjs`

const loading = (data: Uint8Array) =>
  getDocument({
    data,
    cMapUrl: `${ASSETS}cmaps/`,
    standardFontDataUrl: `${ASSETS}standard_fonts/`,
    wasmUrl: `${ASSETS}wasm/`,
    iccUrl: `${ASSETS}iccs/`,
    canvasMaxAreaInBytes: MAX_IMAGE_BYTES,
  })

const shapeOf = async (document: PDFDocumentProxy) => {
  const { width, height } = (await document.getPage(1)).getViewport({ scale: 1 })
  return height / width
}

const openPdf = (file: OpenFile): Opening => {
  let task: PDFDocumentLoadingTask | undefined
  let closed = false
  const opened = file.bytes().then(async data => {
    if (closed) throw new Error('closed')
    task = loading(data)
    const document = await task.promise
    return { document, shape: await shapeOf(document) }
  })
  const close = () => {
    closed = true
    void task?.destroy()
  }
  return { opened, close }
}

const openProblem = (error: unknown) => (error instanceof PasswordException ? 'This PDF is locked with a password.' : `Couldn't open this PDF: ${errorMessage(error)}`)

export { openPdf, openProblem, type Opened }
