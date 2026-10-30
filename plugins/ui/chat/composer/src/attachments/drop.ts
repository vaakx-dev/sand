import type { Kit } from '@sand/ui-kit/contract'
import { div, listen, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { Files } from './files'

const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes('Files')

export const catchFiles = (files: Files) => {
  const dropping = sig(false)
  let depth = 0
  listen(document, 'paste', (event: ClipboardEvent) => {
    const pasted = [...(event.clipboardData?.files ?? [])]
    if (!pasted.length) return
    event.preventDefault()
    files.add(pasted)
  })
  listen(document, 'dragenter', (event: DragEvent) => {
    if (!hasFiles(event)) return
    depth++
    dropping.set(true)
  })
  listen(document, 'dragleave', (event: DragEvent) => {
    if (!hasFiles(event)) return
    depth = Math.max(0, depth - 1)
    if (!depth) dropping.set(false)
  })
  listen(document, 'dragover', (event: DragEvent) => {
    if (hasFiles(event)) event.preventDefault()
  })
  listen(document, 'drop', (event: DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    depth = 0
    dropping.set(false)
    files.add(event.dataTransfer?.files ?? [])
  })
  return dropping
}

const placed = (rect: DOMRect) => ({ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` })

export const chatDrop = ({ icon }: Kit, dropping: Sig<boolean>, area: () => DOMRect | undefined) =>
  show(dropping, () => {
    const rect = area()
    return div(
      { class: ['pointer-events-none fixed z-30 p-2', rect ? '' : 'inset-0'], style: rect && placed(rect) },
      div(
        { class: 'flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-neutral-900/90 text-sm text-neutral-100 animate-fade' },
        span({ class: 'inline-flex text-neutral-400' }, icon('paperclip', 'lg')),
        'Drop files to attach',
      ),
    )
  })
