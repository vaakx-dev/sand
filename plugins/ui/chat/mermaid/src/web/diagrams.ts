import { sand, type Theme } from '@sand/ui-theme/contract'
import { sig } from '@vaakx-dev/vrui'
import { drawDiagram, type Drawn } from './integrations/mermaid'

const KEPT = 64

class Diagrams {
  readonly theme = sig<Theme>(sand)
  private readonly drawn = new WeakMap<Theme, Map<string, Drawn>>()
  private queue: Promise<unknown> = Promise.resolve()

  paint(theme: Theme | undefined) {
    this.theme.set(theme ?? sand)
  }

  cached(source: string, theme = this.theme.get()) {
    return this.drawn.get(theme)?.get(source)
  }

  draw(source: string, theme: Theme): Promise<Drawn> {
    const cached = this.cached(source, theme)
    if (cached) return Promise.resolve(cached)
    const drawing = this.queue.then(() => this.cached(source, theme) ?? drawDiagram(theme, source))
    this.queue = drawing
    return drawing.then(drawn => this.remember(theme, source, drawn))
  }

  private remember(theme: Theme, source: string, drawn: Drawn) {
    if (drawn.kind === 'unloaded') return drawn
    const kept = this.drawn.get(theme) ?? new Map<string, Drawn>()
    this.drawn.set(theme, kept)
    kept.delete(source)
    kept.set(source, drawn)
    for (const old of kept.keys()) {
      if (kept.size <= KEPT) break
      kept.delete(old)
    }
    return drawn
  }
}

export { Diagrams }
