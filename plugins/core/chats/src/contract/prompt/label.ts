import type { Prompt, UserContent } from '..'
import { contextLinks } from './context'
import { oneLine } from '@sand/util'
import { promptContent } from './content'

const linkLabels = (text: string) => contextLinks(text).reduceRight((out, link) => out.slice(0, link.start) + link.label + out.slice(link.end), text)

const blockLabel = (block: UserContent) => {
  if (block.type === 'text') return [linkLabels(block.text)]
  return block.type === 'context' ? [] : [block.name ?? block.type]
}

export const promptLabel = (prompt: Prompt) => oneLine(promptContent(prompt).flatMap(blockLabel).join(' ')).slice(0, 120)
