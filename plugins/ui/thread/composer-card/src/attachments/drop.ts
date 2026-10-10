import { div, icon, listen, show, sig, span, type Sig } from '@sand/dom'
import type { Files } from './files'

const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes('Files')

export const catchFiles = (files: Files) => {
  const dropping = sig(false)
  let depth = 0
  listen(document, 'paste', (event: ClipboardEvent) => {
    const pasted = [...(event.clipboardData?.files ?? [])]
    if (!pasted.length) return
    event.preventDefault()
    void files.add(pasted)
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
    void files.add(event.dataTransfer?.files ?? [])
  })
  return dropping
}

const placed = (rect: DOMRect) => ({ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` })

export const chatDrop = (dropping: Sig<boolean>, area: () => DOMRect | undefined) =>
  show(dropping, () => {
    const rect = area()
    return div(
      { class: ['pointer-events-none fixed z-30 p-2', rect ? '' : 'inset-0'], style: rect && placed(rect) },
      div(
        { class: 'cc-drop flex h-full w-full items-center justify-center rounded-2xl border-2 border-accent-500' },
        span({ class: 'inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 shadow-xl ring-1 ring-accent-900' }, icon('paperclip', 16), 'Drop files to attach'),
      ),
    )
  })
