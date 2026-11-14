import type { OpenFile } from '@sand/file-viewer/contract'
import { bytes } from '@sand/util'
import { fontNames } from './names'

const MAX_FONT_BYTES = 32 * 1024 * 1024

const loadedFace = async (data: ArrayBuffer) => {
  const face = new FontFace(`sand-file-${crypto.randomUUID()}`, data)
  await face.load().catch(() => {
    throw new Error("it isn't a font the browser can read")
  })
  return face
}

const fontOf = async (file: OpenFile) => {
  if (file.size > MAX_FONT_BYTES) throw new Error(`it is ${bytes(file.size)}, and the viewer opens fonts up to ${bytes(MAX_FONT_BYTES)}`)
  const data = await (await file.blob()).arrayBuffer()
  const [names, face] = await Promise.all([fontNames(new Uint8Array(data)), loadedFace(data)])
  return { face, names, fallbackName: file.name.replace(/\.[^.]+$/, '') }
}

export { fontOf }
