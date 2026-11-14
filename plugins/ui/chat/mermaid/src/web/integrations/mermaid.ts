import type { Theme } from '@sand/ui-theme/contract'
import { errorMessage } from '@sand/util'
import type { Mermaid } from 'mermaid'
import { diagramConfig } from '../config'

type Drawn = { kind: 'drawn'; svg: string } | { kind: 'failed'; error: string } | { kind: 'unloaded'; error: string }

const DRAFT_ID = 'sand-mermaid-draft'

let library: Promise<Mermaid> | undefined

let placed = 0

const loadLibrary = () =>
  (library ??= import('mermaid').then(
    module => module.default,
    (error: unknown) => {
      library = undefined
      throw error
    },
  ))

const drawWith = async (mermaid: Mermaid, theme: Theme, source: string): Promise<Drawn> => {
  mermaid.initialize(diagramConfig(theme, getComputedStyle(document.body).fontFamily))
  try {
    const { svg } = await mermaid.render(DRAFT_ID, source)
    return { kind: 'drawn', svg }
  } catch (error) {
    return { kind: 'failed', error: `Couldn't draw this diagram. ${errorMessage(error)}` }
  }
}

const drawDiagram = async (theme: Theme, source: string): Promise<Drawn> => {
  const loaded = await loadLibrary().then(
    mermaid => ({ mermaid }),
    (error: unknown) => ({ error: errorMessage(error) }),
  )
  if ('error' in loaded) return { kind: 'unloaded', error: `Couldn't load the diagram renderer. ${loaded.error}` }
  return drawWith(loaded.mermaid, theme, source)
}

const placeDiagram = (svg: string) => {
  const template = document.createElement('template')
  template.innerHTML = svg.replaceAll(DRAFT_ID, `sand-mermaid-${++placed}`)
  const box = template.content.querySelector('svg')?.viewBox.baseVal
  return { node: template.content, size: { width: box?.width ?? 0, height: box?.height ?? 0 } }
}

export { drawDiagram, placeDiagram, type Drawn }
