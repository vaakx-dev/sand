import type { Zip } from '@sand/zip'
import { insidePath } from '../path'
import { named, parseXml } from '../xml'

interface Book {
  title: string
  author: string
  chapters: string[]
}

const MAX_CHAPTERS = 2_000
const CHAPTER_TYPES = new Set(['application/xhtml+xml', 'text/html'])

const textOf = (root: Document, name: string) => named(root, name)[0]?.textContent?.trim() ?? ''

const packagePath = async (zip: Zip) => {
  const container = parseXml(await zip.text('META-INF/container.xml'))
  const path = named(container, 'rootfile')[0]?.getAttribute('full-path')
  if (!path || !zip.has(path)) throw new Error('it has no package file')
  return path
}

const chapterPaths = (zip: Zip, pack: Document, packPath: string) => {
  const manifest = new Map(named(pack, 'item').map(item => [item.getAttribute('id') ?? '', item]))
  const spine = named(pack, 'itemref').slice(0, MAX_CHAPTERS)
  return spine.flatMap(reference => {
    const item = manifest.get(reference.getAttribute('idref') ?? '')
    if (!item || !CHAPTER_TYPES.has(item.getAttribute('media-type') ?? '')) return []
    const path = insidePath(packPath, item.getAttribute('href') ?? '')
    return path && zip.has(path) ? [path] : []
  })
}

const bookOf = async (zip: Zip): Promise<Book> => {
  const packPath = await packagePath(zip)
  const pack = parseXml(await zip.text(packPath))
  const chapters = chapterPaths(zip, pack, packPath)
  if (!chapters.length) throw new Error('it has no chapters')
  return { title: textOf(pack, 'title'), author: textOf(pack, 'creator'), chapters }
}

export { bookOf, type Book }
