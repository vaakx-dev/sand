import { div, icon, listen, show, sig, span, type Sig } from '@sand/dom'
import type { Files } from './files'

const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes('Files')

export const catchFiles = (files: Files) => {
  const dropping = sig(false)
  let depth = 0
  listen(document, 'paste', event => {
    const pasted = [...((event as ClipboardEvent).clipboardData?.files ?? [])]
    if (!pasted.length) return
    event.preventDefault()
    void files.add(pasted)
  })
  listen(document, 'dragenter', event => {
    if (!hasFiles(event as DragEvent)) return
    depth++
    dropping.set(true)
  })
  listen(document, 'dragleave', event => {
    if (!hasFiles(event as DragEvent)) return
    depth = Math.max(0, depth - 1)
    if (!depth) dropping.set(false)
  })
  listen(document, 'dragover', event => {
    if (hasFiles(event as DragEvent)) event.preventDefault()
  })
  listen(document, 'drop', event => {
    const drag = event as DragEvent
    if (!hasFiles(drag)) return
    event.preventDefault()
    depth = 0
    dropping.set(false)
    void files.add(drag.dataTransfer?.files ?? [])
  })
  return dropping
}

export const chatDrop = (dropping: Sig<boolean>, area: () => DOMRect | undefined) =>
  show(dropping, () => {
    const rect = area()
    return div(
      {
        class: 'pointer-events-none fixed z-30 p-2',
        style: rect ? { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` } : { inset: '0' },
      },
      div(
        { class: 'cc-drop flex h-full w-full items-center justify-center rounded-2xl border-2 border-accent-500' },
        span({ class: 'inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 shadow-xl ring-1 ring-accent-900' }, icon('paperclip', 16), 'Drop files to attach'),
      ),
    )
  })
