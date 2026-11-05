import type { Prompt, UserContent } from '..'
import { isContextLink, textPieces } from './context'
import { oneLine } from '@sand/util'
import { promptContent } from './content'

const linkLabels = (text: string) =>
  textPieces(text)
    .map(piece => (isContextLink(piece) ? piece.label : piece))
    .join('')

const blockLabel = (block: UserContent) => {
  if (block.type === 'text') return [linkLabels(block.text)]
  return block.type === 'context' ? [] : [block.name ?? block.type]
}

export const promptLabel = (prompt: Prompt) => oneLine(promptContent(prompt).flatMap(blockLabel).join(' ')).slice(0, 120)
