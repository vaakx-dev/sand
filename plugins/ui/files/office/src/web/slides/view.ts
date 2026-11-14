import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, el, img, p, sig, span, table, td, tr } from '@vaakx-dev/vrui'
import { openArchive } from '../archive'
import { awaited } from '../awaited'
import { note } from '../note'
import { type Anchor, type Deck, deckOf, EMU_PER_POINT, type Frame, type Paragraph, type Run, type Shape, type Slide, type TableCell } from './deck'

const ANCHOR_LOOKS: Record<Anchor, string> = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' }

const STEP_KEYS: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, PageUp: -1, ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1 }

const CELL_INSETS = { across: 91_440, down: 45_720 }

const units = (deck: Deck) => {
  const width = (emu: number) => `${(emu / deck.width) * 100}cqw`
  const points = (value: number) => width(value * EMU_PER_POINT)
  const place = (frame: Frame) => ({
    left: `${(frame.x / deck.width) * 100}%`,
    top: `${(frame.y / deck.height) * 100}%`,
    width: `${(frame.width / deck.width) * 100}%`,
    height: `${(frame.height / deck.height) * 100}%`,
    ...(frame.rotation && { rotate: `${frame.rotation}deg` }),
  })
  return { width, points, place }
}

type Units = ReturnType<typeof units>

const decoration = (run: Run) => [run.underline && 'underline', run.strike && 'line-through'].filter(Boolean).join(' ') || undefined

const runView = (measure: Units, run: Run) => {
  if (run.lineBreak) return el('br')
  return span(
    {
      class: [run.bold && 'font-bold', run.italic && 'italic'],
      style: { fontSize: measure.points(run.size), textDecorationLine: decoration(run), fontFamily: run.font && `"${run.font}", system-ui, sans-serif` },
    },
    run.text,
  )
}

const bulletView = (measure: Units, paragraph: Paragraph) => {
  if (!paragraph.bullet) return null
  const hanging = Math.max(0, -paragraph.indent)
  return span({ class: 'inline-block', style: { minWidth: measure.width(hanging) } }, `${paragraph.bullet}\u00a0`)
}

const paragraphView = (measure: Units, paragraph: Paragraph) =>
  p(
    {
      style: {
        textAlign: paragraph.align,
        fontSize: measure.points(paragraph.size),
        lineHeight: String(paragraph.lineHeight),
        marginTop: measure.points(paragraph.spaceBefore),
        marginBottom: measure.points(paragraph.spaceAfter),
        paddingLeft: measure.width(paragraph.margin),
        textIndent: measure.width(paragraph.indent),
      },
    },
    bulletView(measure, paragraph),
    paragraph.runs.length > 0 ? paragraph.runs.map(run => runView(measure, run)) : '\u00a0',
  )

const tableCellView = (measure: Units, cell: TableCell) =>
  td(
    {
      class: 'border border-neutral-700 align-top',
      colSpan: cell.columnSpan,
      rowSpan: cell.rowSpan,
      style: { padding: `${measure.width(CELL_INSETS.down)} ${measure.width(CELL_INSETS.across)}` },
    },
    cell.paragraphs.map(paragraph => paragraphView(measure, paragraph)),
  )

const pictureView = (measure: Units, shape: Extract<Shape, { kind: 'picture' }>) => {
  const src = URL.createObjectURL(shape.image)
  return img({ src, alt: shape.alt, class: 'absolute object-cover', style: measure.place(shape.frame), onMount: () => () => URL.revokeObjectURL(src) })
}

const shapeView = (measure: Units, shape: Shape) => {
  switch (shape.kind) {
    case 'text':
      return div(
        {
          class: ['absolute flex flex-col', ANCHOR_LOOKS[shape.anchor], !shape.wrap && 'whitespace-nowrap'],
          style: {
            ...measure.place(shape.frame),
            padding: [shape.insets.top, shape.insets.right, shape.insets.bottom, shape.insets.left].map(measure.width).join(' '),
          },
        },
        shape.paragraphs.map(paragraph => paragraphView(measure, paragraph)),
      )
    case 'picture':
      return pictureView(measure, shape)
    case 'table': {
      const total = shape.columns.reduce((sum, width) => sum + width, 0) || 1
      return div(
        { class: 'absolute', style: measure.place(shape.frame) },
        table(
          { class: 'w-full border-collapse', style: { tableLayout: 'fixed' } },
          el('colgroup', shape.columns.map(width => el('col', { style: { width: `${(width / total) * 100}%` } }))),
          shape.rows.map(row => tr(row.map(cell => tableCellView(measure, cell)))),
        ),
      )
    }
  }
}

const slideFrame = (deck: Deck, index: number, slide: Slide) => {
  const measure = units(deck)
  return div(
    {
      role: 'img',
      'aria-label': `Slide ${index + 1}`,
      class: 'relative shrink-0 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 leading-tight text-neutral-100 shadow-sm',
      style: { width: `min(100cqw, ${(deck.width / deck.height) * 100}cqh)`, aspectRatio: `${deck.width} / ${deck.height}`, containerType: 'inline-size' },
    },
    slide.shapes.map(shape => shapeView(measure, shape)),
  )
}

const slideView = (kit: Kit, deck: Deck, index: number) =>
  awaited({ kit, pending: deck.slide(index), failure: `Couldn't read slide ${index + 1}`, shown: slide => slideFrame(deck, index, slide) })

const deckView = async (file: OpenFile, kit: Kit) => {
  const deck = await deckOf(await openArchive(file))
  if (deck.count === 0) return note(kit, 'This presentation has no slides.')
  const current = sig(0)
  const go = (index: number) => current.set(Math.max(0, Math.min(deck.count - 1, index)))
  const step = (by: number) => go(current.get() + by)
  const keyed = (event: KeyboardEvent) => {
    if (event.key === 'Home') return go(0)
    if (event.key === 'End') return go(deck.count - 1)
    const by = STEP_KEYS[event.key]
    if (by === undefined) return
    event.preventDefault()
    step(by)
  }
  return div(
    { class: 'flex min-h-0 flex-1 flex-col outline-none', style: { flexBasis: '0px' }, tabIndex: 0, 'aria-label': `${file.name} slides`, onKeyDown: keyed },
    div({ class: 'flex min-h-0 flex-1 items-center justify-center p-3', style: { containerType: 'size' } }, dynamicChild(current, index => slideView(kit, deck, index))),
    div(
      { class: 'flex h-12 shrink-0 items-center justify-center gap-2 border-t border-neutral-800' },
      kit.iconButton({ title: 'Previous slide', 'aria-label': 'Previous slide', class: 'aria-disabled:opacity-40', 'aria-disabled': () => String(current.get() === 0), onClick: () => step(-1) }, kit.icon('left')),
      span({ class: 'min-w-24 text-center text-sm text-neutral-400 tabular-nums', 'aria-live': 'polite' }, () => `Slide ${current.get() + 1} of ${deck.count}`),
      kit.iconButton({ title: 'Next slide', 'aria-label': 'Next slide', class: 'aria-disabled:opacity-40', 'aria-disabled': () => String(current.get() === deck.count - 1), onClick: () => step(1) }, kit.icon('right')),
    ),
  )
}

export { deckView }
