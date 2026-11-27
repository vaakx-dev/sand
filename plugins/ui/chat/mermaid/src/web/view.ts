import type { SheetSpec } from '@sand/ui-shell/contract'
import type { Theme } from '@sand/ui-theme/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'
import { onceNearView } from '@sand/reactive'
import { derive, div, dynamicChild, effect, keys, show, sig } from '@vaakx-dev/vrui'
import type { Diagrams } from './diagrams'
import { type Drawn, placeDiagram } from './integrations/mermaid'

type Showing = 'diagram' | 'source'

type Face = Drawn | { kind: 'waiting' } | { kind: 'source' }

type Picture = Extract<Drawn, { kind: 'drawn' }>

interface Parts {
  kit: Kit
  diagrams: Diagrams
  fullScreen(sheet: SheetSpec): void
}

interface FaceActions {
  retry(): void
  expand(): void
}

const WAITING: Face = { kind: 'waiting' }

const SOURCE: Face = { kind: 'source' }

const READABLE_TEXT_PX = 12

let shown = 0

const CHOICES: Choice<Showing>[] = [
  { value: 'diagram', label: 'Diagram' },
  { value: 'source', label: 'Source' },
]

const sourceBlock = (kit: Kit, source: string) => kit.codeBlock({ class: 'whitespace-pre' }, source)

const readableScale = ({ textPx }: Picture) => READABLE_TEXT_PX / textPx

const fittedDiagram = (picture: Picture, expand: () => void) => {
  const diagram = placeDiagram(picture.svg)
  const narrowestPx = diagram.size.width * Math.min(1, readableScale(picture))
  return div({ class: 'overflow-x-auto', onClick: expand }, div({ class: 'cursor-zoom-in', style: { minWidth: `${narrowestPx}px` } }, diagram.node))
}

const fullScreenDiagram = (kit: Kit, title: string, picture: Picture): SheetSpec => {
  const diagram = placeDiagram(picture.svg)
  const zoom = kit.fitZoom(diagram.size, { readableLevel: readableScale(picture) })
  return {
    label: `Full screen ${title}`,
    look: 'viewer',
    title,
    onKeyDown: keys(zoom.control.shortcuts),
    head: () => kit.zoomControls(zoom.control),
    body: () => kit.zoomStage(zoom, {}, diagram.node),
  }
}

const faceView = (kit: Kit, source: string, face: Face, { retry, expand }: FaceActions) => {
  switch (face.kind) {
    case 'source':
      return sourceBlock(kit, source)
    case 'waiting':
      return div({ class: 'flex h-24 items-center justify-center rounded-lg bg-neutral-950' }, kit.spinner())
    case 'drawn':
      return fittedDiagram(face, expand)
    case 'failed':
      return div({ class: 'flex flex-col gap-1' }, sourceBlock(kit, source), kit.errorText(face.error))
    case 'unloaded':
      return div(
        { class: 'flex flex-col items-start gap-2' },
        kit.errorText(face.error),
        kit.secondaryAction({ size: 'sm', onClick: retry }, 'Try again'),
        sourceBlock(kit, source),
      )
  }
}

const diagramView = ({ kit, diagrams, fullScreen }: Parts, source: string, title: string) =>
  kit.ownedByNode(() => {
    const showing = sig<Showing>('diagram')
    const near = sig(false)
    const drawing = sig<Face>(diagrams.cached(source) ?? WAITING)
    const draw = (theme: Theme) =>
      void diagrams.draw(source, theme).then(drawn => {
        if (diagrams.theme.get() === theme) drawing.set(drawn)
      })
    const retry = () => {
      drawing.set(WAITING)
      draw(diagrams.theme.get())
    }
    const expand = () => {
      const face = drawing.get()
      if (face.kind === 'drawn') fullScreen(fullScreenDiagram(kit, title, face))
    }
    effect(() => {
      if (near.get()) draw(diagrams.theme.get())
    })
    const face = derive(() => (showing.get() === 'source' ? SOURCE : drawing.get()))
    const readable = () => drawing.get().kind === 'drawn' || drawing.get().kind === 'waiting'
    const expandable = () => face.get().kind === 'drawn'
    return div(
      { class: 'flex min-w-0 flex-col gap-1', 'data-diagram': String(++shown), onMount: element => onceNearView(element, () => near.set(true)) },
      dynamicChild(face, value => faceView(kit, source, value, { retry, expand })),
      div(
        { class: 'flex items-center gap-1' },
        show(readable, () => kit.segmented(CHOICES, showing, choice => showing.set(choice), { label: 'Show as' })),
        kit.copyButton({ text: () => source }),
        show(expandable, () => kit.iconButton({ title: 'Open full screen', 'aria-label': 'Open full screen', onClick: expand }, kit.icon('expand'))),
      ),
    )
  })

export { diagramView }
