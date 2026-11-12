import { dirname } from 'node:path'
import { fullPath, inlineImages } from './images'

type Kind = 'stylesheet' | 'script'

interface Asset {
  kind: Kind
  path: string
}

const remote = /^(?:[a-z][a-z\d+.-]+:|\/\/)/i
const fileUrl = /^file:/i
const closingTag: Record<Kind, RegExp> = { stylesheet: /<\/style/gi, script: /<\/script/gi }
const escapedTag: Record<Kind, string> = { stylesheet: '<\\/style', script: '<\\/script' }

const local = (path: string | null): path is string => !!path && (fileUrl.test(path) || !remote.test(path))

const found = (html: string) => {
  const assets: Asset[] = []
  new HTMLRewriter()
    .on('link[rel="stylesheet" i][href]', { element: link => void assets.push({ kind: 'stylesheet', path: link.getAttribute('href')! }) })
    .on('script[src]', { element: script => void assets.push({ kind: 'script', path: script.getAttribute('src')! }) })
    .transform(html)
  return assets.filter(asset => local(asset.path))
}

const read = async ({ kind, path }: Asset, base: string) => {
  const full = fullPath(path, base)
  const file = Bun.file(full)
  if (!(await file.exists())) throw new Error(`The page links the ${kind} ${path}, and there is no file at ${full}.`)
  const text = (await file.text()).replace(closingTag[kind], escapedTag[kind])
  if (kind === 'script') return { text, missing: [] }
  const { html, missing } = await inlineImages(text, dirname(full))
  return { text: html, missing }
}

const key = ({ kind, path }: Asset) => `${kind} ${path}`

export const inlineAssets = async (html: string, base: string) => {
  const assets = found(html)
  if (!assets.length) return { html, missing: [] }
  const texts = new Map(await Promise.all(assets.map(async asset => [key(asset), await read(asset, base)] as const)))
  const textOf = (kind: Kind, path: string | null) => (local(path) ? texts.get(key({ kind, path })) : undefined)
  const inlined = new HTMLRewriter()
    .on('link[rel="stylesheet" i][href]', {
      element: link => {
        const asset = textOf('stylesheet', link.getAttribute('href'))
        if (asset) link.replace(`<style>${asset.text}</style>`, { html: true })
      },
    })
    .on('script[src]', {
      element: script => {
        const asset = textOf('script', script.getAttribute('src'))
        if (!asset) return
        script.removeAttribute('src')
        script.setInnerContent(asset.text, { html: true })
      },
    })
    .transform(html)
  return { html: inlined, missing: [...texts.values()].flatMap(asset => asset.missing) }
}
