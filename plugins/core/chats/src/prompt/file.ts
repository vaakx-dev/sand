import type { FileBlock, UnpackedFolder } from '../contract'
import { bytes, plural } from '@sand/util'

const unpackedLines = ({ path, files, entries, notes }: UnpackedFolder) => {
  const more = files > entries.length ? ', …' : ''
  const listed = entries.length ? `: ${entries.join(', ')}${more}` : ''
  const unpacked = `Unpacked to ${path} (${plural(files, 'file')})${listed}`
  return notes?.length ? `${unpacked}\nNot unpacked: ${notes.join('; ')}` : unpacked
}

export const fileText = (block: FileBlock) => {
  const saved = `The user attached "${block.name}" (${bytes(block.size)}). It is saved at ${block.path}.`
  return block.unpacked ? `${saved}\n${unpackedLines(block.unpacked)}` : saved
}
