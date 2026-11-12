import { mkdir, readdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { clearFolder } from './leftover'

const staleMs = 60 * 60_000

const renameTries = 3

const busyFolderMs = 150

const asideName = /^removed-(\d+)-[0-9a-f-]{36}$/

const trashIn = (folder: string) => join(folder, '.trash')

const moved = (from: string, to: string) =>
  rename(from, to).then(
    () => true,
    () => false,
  )

const setAside = async (folder: string, path: string) => {
  const trash = trashIn(folder)
  const aside = join(trash, `removed-${Date.now()}-${crypto.randomUUID()}`)
  await mkdir(trash, { recursive: true })
  for (let tries = 1; tries <= renameTries; tries++) {
    if (await moved(path, aside)) return aside
    if (tries < renameTries) await Bun.sleep(busyFolderMs)
  }
  return undefined
}

const putBack = (aside: string, path: string) => rename(aside, path)

const isStale = (name: string, now: number) => {
  const setAt = asideName.exec(name)?.[1]
  return setAt !== undefined && now - Number(setAt) >= staleMs
}

const emptyStaleTrash = async (folder: string, now: number) => {
  const trash = trashIn(folder)
  const stale = (await readdir(trash).catch(() => [])).filter(name => isStale(name, now))
  for (const name of stale) await clearFolder(join(trash, name))
}

export { emptyStaleTrash, putBack, setAside }
