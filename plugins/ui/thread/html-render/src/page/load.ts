import type { LoadedPage } from '@sand/protocol'
import { dirname, resolve } from 'node:path'
import { bootstrap } from './bootstrap'
import { inlineImages } from './images'
import { maxPageBytes } from './limits'

const doctype = /^\s*<!doctype[^>]*>/i

export const load = async (path: string, cwd: string): Promise<LoadedPage> => {
  const full = resolve(cwd, path)
  const file = Bun.file(full)
  if (!(await file.exists())) throw new Error(`There is no file at ${full}.`)
  if (file.size > maxPageBytes) throw new Error(`${full} is larger than ${maxPageBytes / 1024 / 1024} MB.`)
  const { html, missing } = await inlineImages(await file.text(), dirname(full))
  return { html: `<!doctype html>${bootstrap}${html.replace(doctype, '')}`, missing }
}
