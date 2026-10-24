import type { Markdown } from '@sand/markdown/contract'
import type { FileContent } from '@sand/project/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, el, img } from '@vaakx-dev/vrui'
import { extension, fileName } from '../paths'

const highlightLimit = 300_000

const sizeText = (bytes: number) => (bytes < 1_000_000 ? `${Math.ceil(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`)

const codeView = (text: string, language: string, markdown?: Markdown) => {
  const numbers = Array.from({ length: text.split('\n').length }, (_, index) => index + 1).join('\n')
  const code = markdown && text.length <= highlightLimit ? markdown.highlight(text, language) : [text]
  return div(
    { class: 'flex pb-6 font-mono text-xs leading-relaxed' },
    el('pre', { class: 'sticky left-0 shrink-0 select-none bg-neutral-950 pr-3 pl-4 text-right text-neutral-500' }, numbers),
    el('pre', { class: 'flex-1 pr-4 text-neutral-300' }, ...code),
  )
}

export const fileBody = ({ hint }: Kit, content: FileContent, path: string, markdown?: Markdown) => {
  if (content.skipped === 'large') return hint(`Too large to show (${sizeText(content.size)})`)
  if (content.skipped === 'binary') return hint(`Binary file (${sizeText(content.size)})`)
  if (content.image) return div({ class: 'px-4 pb-6' }, img({ src: content.image, alt: fileName(path), class: 'block h-auto max-w-full' }))
  const text = content.text ?? ''
  const language = extension(path)
  if (markdown && language === 'md') return div({ class: 'px-4 pb-6 text-sm text-neutral-300 wrap-anywhere' }, ...markdown.nodes(text))
  return codeView(text, language, markdown)
}
