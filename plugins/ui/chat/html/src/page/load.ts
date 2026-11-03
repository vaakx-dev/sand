import { bytes } from '@sand/util'
import type { LoadedPage } from '../contract'
import { dirname, resolve } from 'node:path'
import { bootstrap } from './bootstrap'
import { inlineImages } from './images'
import { maxPageBytes } from './limits'
import { pageStart } from './protocol'
import { rejectViewportUnits } from './viewport'

const doctype = /^\s*<!doctype[^>]*>/i

export const prepare = async (html: string, base: string): Promise<LoadedPage> => {
  rejectViewportUnits(html)
  const { html: inlined, missing } = await inlineImages(html, base)
  const size = Buffer.byteLength(inlined, 'utf8')
  if (size > maxPageBytes) throw new Error(`With its images inlined the page is ${bytes(size)}. The limit is ${bytes(maxPageBytes)}; use smaller images.`)
  return { html: `${pageStart}${await bootstrap()}${inlined.replace(doctype, '')}`, missing }
}

export const load = async (path: string, cwd: string): Promise<LoadedPage> => {
  const full = resolve(cwd, path)
  const file = Bun.file(full)
  if (!(await file.exists())) throw new Error(`There is no file at ${full}. Write the page there first, or pass its HTML as html.`)
  if (file.size > maxPageBytes) throw new Error(`${full} is larger than ${bytes(maxPageBytes)}.`)
  return prepare(await file.text(), dirname(full))
}
