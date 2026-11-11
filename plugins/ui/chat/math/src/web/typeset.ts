import type { Typeset } from '../contract'
import { frame } from './frame'

type Renderer = typeof import('./render')

type Render = Renderer['render']

const kept = 500

const rendered = new Map<string, Typeset>()

let renderer: Renderer | undefined

let loading: Promise<Renderer> | undefined

const loadRenderer = () => (loading ??= import('./render').then(module => (renderer = module)))

const remember = (key: string, result: Typeset) => {
  rendered.delete(key)
  rendered.set(key, result)
  for (const old of rendered.keys()) {
    if (rendered.size <= kept) break
    rendered.delete(old)
  }
}

const typesetWith = (draw: Render, tex: string, displayMode: boolean): Typeset => {
  const key = `${displayMode ? 'display' : 'inline'}:${tex}`
  const result = rendered.get(key) ?? draw(tex, displayMode)
  remember(key, result)
  return result instanceof Node ? result.cloneNode(true) : result
}

const typesetLater = (tex: string, displayMode: boolean) => {
  const placeholder = frame(displayMode)
  void loadRenderer().then(loaded => loaded.renderInto(placeholder, tex, displayMode))
  return placeholder
}

const typeset = (tex: string, displayMode: boolean): Typeset => (renderer ? typesetWith(renderer.render, tex, displayMode) : typesetLater(tex, displayMode))

export { loadRenderer, typeset }
