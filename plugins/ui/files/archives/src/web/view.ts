import type { FileViewer, OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { bytes, errorMessage, plural } from '@sand/util'
import { div, dynamicChild, type Sig, sig } from '@vaakx-dev/vrui'
import { readArchive, unpackEntry } from './archive'
import type { Entry } from './entry'
import { MAX_ARCHIVE_BYTES } from './limits'
import { openedEntry } from './opened'
import { childrenOf, findEntry, type Folder, itemCount, nameOf, treeOf } from './tree'

interface Parts {
  kit: Kit
  viewer: FileViewer
  file: OpenFile
}

interface Back {
  label: string
  go(): void
}

interface Bar {
  title: string
  meta: string
  back?: Back
}

type Place = { kind: 'folder'; folder: Folder } | { kind: 'entry'; entry: Entry; folder: Folder }

type Unpacked = { kind: 'loading' } | { kind: 'ready'; node: HTMLElement } | { kind: 'failed'; error: string }

interface Browser {
  root: Folder
  place: Sig<Place>
}

const SHOWN_ROWS = 500

const bar = ({ kit }: Parts, { title, meta, back }: Bar) =>
  div(
    { class: ['flex min-h-12 shrink-0 items-center gap-1 border-b border-neutral-800 pr-4', back ? 'pl-2' : 'pl-4'] },
    back ? kit.backButton({ title: back.label, onClick: back.go }) : null,
    div({ class: 'flex min-w-0 flex-1 flex-col' }, kit.rowName(title), kit.metaLine(meta)),
  )

const resolved = (folder: string, target: string) =>
  (target.split(/[?#]/)[0] ?? '').split('/').reduce<string[]>((parts, part) => {
    if (part === '..') return parts.slice(0, -1)
    if (!part || part === '.') return parts
    return [...parts, part]
  }, target.startsWith('/') || !folder ? [] : folder.split('/')).join('/')

const linkIn = ({ kit }: Parts, browser: Browser | undefined, folder: string) => (target: string, label: (Node | string)[]) => {
  const found = browser && findEntry(browser.root, resolved(folder, target))
  if (!found) return undefined
  return kit.plainButton({ class: 'inline cursor-pointer rounded-md underline hover:text-neutral-400', title: `Open ${found.entry.path}`, onClick: () => browser.place.set({ kind: 'entry', ...found }) }, ...label)
}

const entryBody = (parts: Parts, entry: Entry, link: ReturnType<typeof linkIn>) => {
  const state = sig<Unpacked>({ kind: 'loading' })
  unpackEntry(entry).then(
    content => state.set({ kind: 'ready', node: parts.viewer.render(openedEntry({ archive: parts.file, entry, content, link })) }),
    (error: unknown) => state.set({ kind: 'failed', error: `Couldn't open ${nameOf(entry.path)}: ${errorMessage(error)}` }),
  )
  return dynamicChild(state, value => {
    if (value.kind === 'ready') return value.node
    if (value.kind === 'failed') return div({ class: 'p-2' }, parts.kit.errorState({ text: value.error }))
    return parts.kit.loadingState({ text: 'Unpacking…' })
  })
}

const entryPane = (parts: Parts, entry: Entry, { back, browser, folder }: { back?: Back; browser?: Browser; folder: string }) =>
  div(
    { class: 'flex flex-1 flex-col' },
    bar(parts, { title: nameOf(entry.path), meta: `${folder || parts.file.name} · ${bytes(entry.size)}`, back }),
    entryBody(parts, entry, linkIn(parts, browser, folder)),
  )

const rows = ({ kit }: Parts, browser: Browser, folder: Folder) => {
  const { folders, files } = childrenOf(folder)
  const folderRows = folders.map(child =>
    kit.listRow({ lead: kit.icon('folder'), title: child.name, trail: plural(itemCount(child), 'item'), opens: true, touch: true, onClick: () => browser.place.set({ kind: 'folder', folder: child }) }),
  )
  const fileRows = files.map(({ name, entry }) =>
    kit.listRow({ lead: kit.icon('file'), title: name, trail: bytes(entry.size), touch: true, onClick: () => browser.place.set({ kind: 'entry', entry, folder }) }),
  )
  const all = [...folderRows, ...fileRows]
  const hidden = all.length - SHOWN_ROWS
  return [...all.slice(0, SHOWN_ROWS), hidden > 0 ? div({ class: 'px-2 py-2' }, kit.metaLine(`${hidden.toLocaleString('en')} more not shown`)) : null]
}

const folderPane = (parts: Parts, browser: Browser, folder: Folder, count: number) => {
  const up = folder.parent
  const back = up && { label: `Back to ${up.name || parts.file.name}`, go: () => browser.place.set({ kind: 'folder', folder: up }) }
  const meta = up ? `${plural(itemCount(folder), 'item')} · ${bytes(folder.size)}` : `${plural(count, 'file')} · ${bytes(folder.size)} unpacked`
  const empty = itemCount(folder) === 0
  return div(
    { class: 'flex flex-1 flex-col' },
    back ? bar(parts, { title: folder.path, meta, back }) : div({ class: 'px-4 pt-3' }, parts.kit.metaLine(meta)),
    empty ? div({ class: 'px-4 py-2' }, parts.kit.emptyState({ text: up ? 'This folder is empty.' : 'This archive is empty.' })) : div({ class: 'flex flex-col p-2' }, ...rows(parts, browser, folder)),
  )
}

const browse = (parts: Parts, root: Folder, count: number) => {
  const browser: Browser = { root, place: sig<Place>({ kind: 'folder', folder: root }) }
  return dynamicChild(browser.place, place => {
    if (place.kind === 'folder') return folderPane(parts, browser, place.folder, count)
    const back = { label: `Back to ${place.folder.name || parts.file.name}`, go: () => browser.place.set({ kind: 'folder', folder: place.folder }) }
    return entryPane(parts, place.entry, { back, browser, folder: place.folder.path })
  })
}

const archiveView = async (parts: Parts) => {
  const { file } = parts
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error(`It's ${bytes(file.size)}; the viewer opens archives up to ${bytes(MAX_ARCHIVE_BYTES)}`)
  const archive = await readArchive({ name: file.name, data: await file.bytes(), modified: file.modified })
  if (archive.kind === 'single') return entryPane(parts, archive.entry, { folder: '' })
  return browse(parts, treeOf(archive), archive.entries.length)
}

export { archiveView }
