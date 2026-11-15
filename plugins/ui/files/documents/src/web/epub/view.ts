import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import type { Zip } from '@sand/zip'
import { type Child, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import { Pictures } from '../pictures'
import { opened } from '../source'
import { parseXhtml } from '../xml'
import { type Book, bookOf } from './book'
import { chapterBody, imagePaths } from './chapter'

interface Reader {
  kit: Kit
  zip: Zip
  book: Book
  pictures: Pictures
  chapters: Map<string, number>
  at: ReturnType<typeof sig<number>>
  go(index: number): void
}

type Loaded = { kind: 'loading' } | { kind: 'ready'; children: Child[] } | { kind: 'failed'; error: string }

const chapterChildren = async (reader: Reader, index: number) => {
  const path = reader.book.chapters[index] ?? ''
  const document = parseXhtml(await reader.zip.text(path))
  const pictures = await reader.pictures.load(imagePaths(document, path))
  return chapterBody({ path, pictures, chapters: reader.chapters, go: reader.go }, document)
}

const chapterView = (reader: Reader, index: number) => {
  const state = sig<Loaded>({ kind: 'loading' })
  chapterChildren(reader, index).then(
    children => state.set({ kind: 'ready', children }),
    (error: unknown) => state.set({ kind: 'failed', error: `Couldn't read this chapter: ${errorMessage(error)}` }),
  )
  return dynamicChild(state, loaded => {
    if (loaded.kind === 'ready') return div({ class: 'px-4' }, reader.kit.prose(...loaded.children))
    if (loaded.kind === 'failed') return reader.kit.errorState({ text: loaded.error })
    return reader.kit.loadingState({})
  })
}

const chapterBar = ({ kit, book, at, go }: Reader) =>
  div(
    { class: 'flex items-center gap-2 px-2 py-2' },
    kit.iconButton({ title: 'Previous chapter', 'aria-label': 'Previous chapter', disabled: () => at.get() === 0, onClick: () => go(at.get() - 1) }, kit.icon('left')),
    span({ class: 'min-w-0 flex-1 truncate text-center text-xs text-neutral-500' }, () => `Chapter ${at.get() + 1} of ${book.chapters.length}`),
    kit.iconButton({ title: 'Next chapter', 'aria-label': 'Next chapter', disabled: () => at.get() === book.chapters.length - 1, onClick: () => go(at.get() + 1) }, kit.icon('right')),
  )

const titleBlock = (kit: Kit, { title, author }: Book) =>
  title || author ? div({ class: 'flex min-w-0 flex-col gap-1 px-4 pt-4' }, kit.sectionTitle(title), author ? kit.metaLine(author) : null) : null

const epubView = async (kit: Kit, file: OpenFile) => {
  const zip = await opened(file)
  const book = await bookOf(zip)
  const at = sig(0)
  const top = div({ style: { scrollMarginTop: '48px' } })
  const go = (index: number) => {
    at.set(Math.min(Math.max(index, 0), book.chapters.length - 1))
    top.scrollIntoView({ block: 'start' })
  }
  const chapters = new Map(book.chapters.map((chapter, index) => [chapter, index]))
  const reader = { kit, zip, book, pictures: new Pictures(zip), chapters, at, go }
  return div(
    { class: 'flex min-w-0 flex-col', onMount: () => () => reader.pictures.revoke() },
    top,
    titleBlock(kit, book),
    chapterBar(reader),
    dynamicChild(at, index => chapterView(reader, index)),
    chapterBar(reader),
  )
}

export { epubView }
