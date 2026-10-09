import { errorMessage } from '@sand/kit'
import { removeQuietly } from '@sand/kit/host'
import { mkdir, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Version, VersionSource, VersionTarget } from './contract'
import { contentAt, contentHash, copyContent } from './content'
import { readIndex, writeIndex } from './index-file'
import { replaceTarget } from './replace'
import { discoverTargets, present, type TargetInfo, targetInfo } from './targets'

const keep = 30

const serial = () => {
  let tail: Promise<unknown> = Promise.resolve()
  return <T>(task: () => Promise<T>): Promise<T> => {
    const next = tail.then(task)
    tail = next.catch(() => {})
    return next
  }
}

export const createVersionStore = async (home: string, changed: () => void = () => {}) => {
  const root = join(home, 'versions')
  const staging = join(root, '.staging')
  await mkdir(root, { recursive: true })
  await removeQuietly(staging)
  const index = await readIndex(root)
  const queue = serial()

  const folderOf = (key: string, id: string) => join(root, encodeURIComponent(key), id)
  const versionsOf = (key: string) => (index.targets[key] ??= [])
  const liveHash = async (info: TargetInfo) => ((await present(info)) ? contentHash(info, info.path) : undefined)

  const known = async () => {
    const found = await discoverTargets(home)
    const keys = new Set(found.map(info => info.key))
    const stored = Object.keys(index.targets).filter(key => !keys.has(key)).map(key => targetInfo(home, key))
    return [...found, ...stored.filter(info => info !== undefined)]
  }

  const prune = async (key: string) => {
    const list = versionsOf(key)
    while (list.length > keep) {
      const at = list.findIndex(version => version.id !== index.good[key])
      if (at < 0) return
      const [old] = list.splice(at, 1)
      await rm(folderOf(key, old!.id), { recursive: true, force: true })
    }
  }

  const take = async (info: TargetInfo, source: VersionSource): Promise<boolean> => {
    const list = versionsOf(info.key)
    const hash = await liveHash(info)
    if (!hash || list.at(-1)?.hash === hash) return false
    const copy = join(staging, Bun.randomUUIDv7())
    try {
      await copyContent(info, info.path, copy)
      const stored = await contentHash(info, contentAt(info, copy))
      if (list.at(-1)?.hash === stored) return false
      const version: Version = { id: Bun.randomUUIDv7(), at: Date.now(), hash: stored, source }
      const folder = folderOf(info.key, version.id)
      await mkdir(dirname(folder), { recursive: true })
      await rename(copy, folder)
      list.push(version)
      await prune(info.key)
      return true
    } finally {
      await removeQuietly(copy)
    }
  }

  const view = async (info: TargetInfo): Promise<VersionTarget> => {
    const list = index.targets[info.key] ?? []
    const hash = await liveHash(info)
    return {
      key: info.key,
      kind: info.kind,
      name: info.name,
      path: info.path,
      exists: hash !== undefined,
      current: hash ? list.findLast(version => version.hash === hash)?.id : undefined,
      good: index.good[info.key],
      versions: [...list].reverse(),
    }
  }

  const save = async () => {
    for (const [key, list] of Object.entries(index.targets)) if (!list.length) delete index.targets[key]
    await writeIndex(root, index)
    changed()
  }

  const infosFor = async (keys?: string[]) =>
    keys ? keys.map(key => targetInfo(home, key)).filter(info => info !== undefined) : await known()

  const list = async () => {
    const infos = await known()
    const views = await Promise.all(infos.map(view))
    return views.sort((a, b) => a.key.localeCompare(b.key))
  }

  const snapshot = (source: VersionSource, keys?: string[]) =>
    queue(async () => {
      let added = false
      for (const info of await infosFor(keys)) added = (await take(info, source)) || added
      if (added) await save()
      else changed()
    })

  const restore = (key: string, id: string) =>
    queue(async () => {
      const info = targetInfo(home, key)
      if (!info) throw new Error(`${key} has no history`)
      if (!versionsOf(key).some(version => version.id === id)) throw new Error(`That version of ${info.name} is gone`)
      await take(info, 'edit')
      await replaceTarget(info, folderOf(key, id), staging)
      await take(info, 'restore')
      await save()
      return view(info)
    })

  const markGood = () =>
    queue(async () => {
      const found = await discoverTargets(home)
      for (const info of found) await take(info, 'edit')
      index.good = Object.fromEntries(
        found.map(info => [info.key, versionsOf(info.key).at(-1)?.id]).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
      await save()
    })

  const backToGood = async (info: TargetInfo) => {
    const good = index.targets[info.key]?.find(version => version.id === index.good[info.key])
    const hash = await liveHash(info)
    if (hash === good?.hash) return false
    await take(info, 'edit')
    await replaceTarget(info, good && folderOf(info.key, good.id), staging)
    await take(info, 'auto-restore')
    return true
  }

  const autoRestore = () =>
    queue(async () => {
      if (!Object.keys(index.good).length) return []
      const names: string[] = []
      for (const info of await known()) {
        const back = await backToGood(info).catch((error: unknown) => {
          console.error(`could not bring back ${info.name}: ${errorMessage(error)}`)
          return false
        })
        if (back) names.push(info.name)
      }
      await save()
      return names
    })

  return { list, snapshot, restore, markGood, autoRestore }
}

export type VersionStore = Awaited<ReturnType<typeof createVersionStore>>
