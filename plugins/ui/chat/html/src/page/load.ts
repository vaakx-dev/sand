import { bytes } from '@sand/util'
import type { LoadedPage } from '../contract'
import { dirname, resolve } from 'node:path'
import { inlineAssets } from './assets'
import { bootstrap } from './bootstrap'
import { dataUrl, inlineImages } from './images'
import { maxPageBytes } from './limits'
import { pageStart } from './protocol'
import { rejectViewportUnits } from './viewport'

const doctype = /^\s*<!doctype[^>]*>/i

const imagePage = (url: string) => `<img src="${url}" alt="" style="display:block;max-width:100%;height:auto">`

export const prepare = async (html: string, base: string): Promise<LoadedPage> => {
  rejectViewportUnits(html)
  const images = await inlineImages(html, base)
  const assets = await inlineAssets(images.html, base)
  const inlined = assets.html
  const missing = [...images.missing, ...assets.missing]
  const size = Buffer.byteLength(inlined, 'utf8')
  if (size > maxPageBytes) throw new Error(`With its images, stylesheets and scripts inlined the page is ${bytes(size)}. The limit is ${bytes(maxPageBytes)}; use smaller files.`)
  return { html: `${pageStart}${await bootstrap()}${inlined.replace(doctype, '')}`, missing }
}

export const load = async (path: string, cwd: string): Promise<LoadedPage> => {
  const full = resolve(cwd, path)
  const file = Bun.file(full)
  if (!(await file.exists())) throw new Error(`There is no file at ${full}. Write the page there first, or pass its HTML as html.`)
  if (file.size > maxPageBytes) throw new Error(`${full} is larger than ${bytes(maxPageBytes)}.`)
  if (file.type.startsWith('image/')) return prepare(imagePage(await dataUrl(full)), dirname(full))
  return prepare(await file.text(), dirname(full))
}
