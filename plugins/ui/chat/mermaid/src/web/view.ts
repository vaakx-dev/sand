import type { SheetSpec } from '@sand/ui-shell/contract'
import type { Theme } from '@sand/ui-theme/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, intersectionObserver, show, sig } from '@vaakx-dev/vrui'
import type { Diagrams } from './diagrams'
import { type Drawn, placeDiagram } from './integrations/mermaid'

type Showing = 'diagram' | 'source'

type Face = Drawn | { kind: 'waiting' } | { kind: 'source' }

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

const NEAR_SCREEN = '400px'

let shown = 0

const CHOICES: Choice<Showing>[] = [
  { value: 'diagram', label: 'Diagram' },
  { value: 'source', label: 'Source' },
]

const whenNear = (element: Element, reached: () => void) =>
  void intersectionObserver(
    element,
    (entries, observer) => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      reached()
    },
    { rootMargin: NEAR_SCREEN },
  )

const sourceBlock = (kit: Kit, source: string) => kit.codeBlock({ class: 'whitespace-pre' }, source)

const fittedDiagram = (svg: string, expand: () => void) => div({ class: 'cursor-zoom-in', onClick: expand }, placeDiagram(svg).node)

const fullScreenDiagram = (kit: Kit, title: string, svg: string): SheetSpec => {
  const diagram = placeDiagram(svg)
  const zoom = kit.fitZoom(diagram.size)
  return {
    label: `Full screen ${title}`,
    look: 'viewer',
    title,
    onKeyDown: zoom.keys,
    head: () => kit.zoomControls(zoom),
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
      return fittedDiagram(face.svg, expand)
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
      if (face.kind === 'drawn') fullScreen(fullScreenDiagram(kit, title, face.svg))
    }
    effect(() => {
      if (near.get()) draw(diagrams.theme.get())
    })
    const face = derive(() => (showing.get() === 'source' ? SOURCE : drawing.get()))
    const readable = () => drawing.get().kind === 'drawn' || drawing.get().kind === 'waiting'
    const expandable = () => face.get().kind === 'drawn'
    return div(
      { class: 'flex min-w-0 flex-col gap-1', 'data-diagram': String(++shown), onMount: element => whenNear(element, () => near.set(true)) },
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
