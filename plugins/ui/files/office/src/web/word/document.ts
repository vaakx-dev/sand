import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import mammoth from 'mammoth'
import { openArchive } from '../archive'
import { viewable } from '../image'
import { note } from '../note'
import { nodesOf } from './nodes'

const STYLES = ['u => u', "p[style-name='Title'] => h1:fresh"]

const imageSource = mammoth.images.imgElement(async image => {
  const bytes = new Uint8Array(await image.readAsArrayBuffer())
  if (!viewable(bytes, image.contentType)) return { src: '' }
  return { src: `data:${image.contentType};base64,${await image.readAsBase64String()}` }
})

const html = async (file: OpenFile) => {
  const archive = await openArchive(file)
  const packed = await archive.repack()
  const converted = await mammoth.convertToHtml({ arrayBuffer: packed.buffer }, { styleMap: STYLES, convertImage: imageSource })
  return converted.value
}

const wordDocument = async (file: OpenFile, kit: Kit) => {
  const nodes = nodesOf(await html(file), file)
  if (nodes.length === 0) return note(kit, 'This document is empty.')
  return div({ 'data-word': '', class: 'mx-auto w-full max-w-2xl px-5 py-6' }, kit.prose(nodes))
}

export { wordDocument }
