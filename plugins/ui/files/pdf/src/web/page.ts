import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { canvas, type Derive, div, dynamicChild, effect, sig } from '@vaakx-dev/vrui'
import { type PageViewport, type PDFDocumentProxy, type PDFPageProxy, RenderingCancelledException, type RenderTask } from 'pdfjs-dist'

interface PageParts {
  kit: Kit
  document: PDFDocumentProxy
  number: number
  width: Derive<number>
  shape: number
}

interface Job {
  stopped: boolean
  task?: RenderTask
}

const MAX_CANVAS_PIXELS = 8 * 1024 * 1024

const pixelRatio = ({ width, height }: PageViewport) => Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)))

const sheet = (viewport: PageViewport, ratio: number) =>
  canvas({ width: Math.floor(viewport.width * ratio), height: Math.floor(viewport.height * ratio), class: 'absolute inset-0 h-full w-full' }) as HTMLCanvasElement

const pageView = ({ kit, document, number, width, shape: firstShape }: PageParts) => {
  const near = sig(false)
  const shape = sig(firstShape)
  const drawn = sig<Node | null>(null)
  let page: PDFPageProxy | undefined

  const paint = async (cssWidth: number, job: Job) => {
    const loaded = (page ??= await document.getPage(number))
    if (job.stopped) return
    const natural = loaded.getViewport({ scale: 1 })
    shape.set(natural.height / natural.width)
    const viewport = loaded.getViewport({ scale: cssWidth / natural.width })
    const ratio = pixelRatio(viewport)
    const target = sheet(viewport, ratio)
    job.task = loaded.render({ canvas: target, viewport, transform: [ratio, 0, 0, ratio, 0, 0] })
    await job.task.promise
    drawn.set(target)
  }

  const failed = (error: unknown) => {
    if (error instanceof RenderingCancelledException) return
    drawn.set(kit.errorState({ text: `Couldn't draw page ${number}: ${errorMessage(error)}` }))
  }

  const draw = (cssWidth: number) => {
    const job: Job = { stopped: false }
    paint(cssWidth, job).catch(failed)
    return () => {
      job.stopped = true
      job.task?.cancel()
    }
  }

  const release = () => {
    drawn.set(null)
    page?.cleanup()
  }

  const node = div(
    {
      role: 'img',
      'aria-label': `Page ${number}`,
      class: 'relative shrink-0 overflow-hidden bg-neutral-900 shadow-md ring-1 ring-neutral-800',
      style: () => ({ width: `${width.get()}px`, height: `${Math.round(width.get() * shape.get())}px` }),
      onMount: () => effect(() => (near.get() ? draw(width.get()) : release())),
    },
    dynamicChild(drawn, shown => shown),
  )
  return { node, near, number }
}

type PageView = ReturnType<typeof pageView>

export { pageView, type PageView }
