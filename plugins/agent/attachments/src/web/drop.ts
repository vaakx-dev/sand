import type { Kit } from '@sand/ui-kit/contract'
import { div, listen, show, sig, span } from '@vaakx-dev/vrui'
import { hasFiles } from './contract'

export interface Catch {
  attachable(): boolean
  add(files: Iterable<File>): void
}

const placed = (rect: DOMRect) => ({ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` })

const overlay = ({ icon }: Kit, rect: DOMRect | undefined) =>
  div(
    { class: ['pointer-events-none fixed z-30 p-2', rect ? '' : 'inset-0'], style: rect && placed(rect) },
    div(
      { class: 'flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-neutral-900/90 text-sm text-neutral-100 animate-fade' },
      span({ class: 'inline-flex text-neutral-400' }, icon('paperclip', 'lg')),
      'Drop files to attach',
    ),
  )

export const refuseStrayDrops = () =>
  listen(window, 'dragover', (event: DragEvent) => {
    if (!hasFiles(event) || event.defaultPrevented || !event.dataTransfer) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'none'
  })

export const drops = (kit: Kit, { attachable, add }: Catch, area: () => Element | null | undefined) => {
  const dropping = sig(false)
  let depth = 0
  const open = () => attachable() && Boolean(area()?.checkVisibility())
  listen(document, 'paste', (event: ClipboardEvent) => {
    const pasted = [...(event.clipboardData?.files ?? [])]
    if (!pasted.length || !open()) return
    event.preventDefault()
    add(pasted)
  })
  listen(document, 'dragenter', (event: DragEvent) => {
    if (!hasFiles(event) || !open()) return
    depth++
    dropping.set(true)
  })
  listen(document, 'dragleave', (event: DragEvent) => {
    if (!hasFiles(event)) return
    depth = Math.max(0, depth - 1)
    if (!depth) dropping.set(false)
  })
  listen(document, 'dragover', (event: DragEvent) => {
    if (hasFiles(event) && open()) event.preventDefault()
  })
  listen(document, 'drop', (event: DragEvent) => {
    if (!hasFiles(event) || !open()) return
    event.preventDefault()
    depth = 0
    dropping.set(false)
    add(event.dataTransfer?.files ?? [])
  })
  return show(dropping, () => overlay(kit, area()?.getBoundingClientRect()))
}
