import {
  botChangeWire,
  botCreate,
  botDelete,
  botFolderChangeWire,
  botFolderCreate,
  botFolderDelete,
  botFolderRemoveWire,
  botFolderRename,
  botMove,
  botRemoveWire,
  botUpdate,
  helloBotFolders,
  helloBots,
  jobCreate,
  jobDelete,
  jobUpdate,
  type BotFolder,
  type BotPatch,
  type BotSummary,
  type JobPatch,
  type NewBot,
  type NewJob,
} from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import type { HelloField, WireEvent } from '@sand/host-hub/contract'
import { owned } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { deviceCache, type DeviceRecords } from '@sand/web-client/contract'
import { derive, effect, sig } from '@vaakx-dev/vrui'
import type { BotsContext } from './context'

interface Listed {
  id: string
  created: number
}

interface ListSource<T> {
  key: string
  hello: HelloField<T[]>
  change: WireEvent<T>
  remove: WireEvent<string>
}

const byCreated = <T extends Listed>(list: T[]) => [...list].sort((a, b) => a.created - b.created)

const syncedList = <T extends Listed>(ctx: BotsContext, { key, hello, change, remove }: ListSource<T>) => {
  const loaded = sig<T[] | undefined>(undefined)
  const sorted = derive(() => {
    const list = loaded.get()
    return list && byCreated(list)
  })

  const keep = (item: T) => {
    loaded.update(list => list && [...list.filter(other => other.id !== item.id), item])
    return item
  }
  const drop = (id: string) => loaded.update(list => list?.filter(other => other.id !== id))

  const kept = sig<DeviceRecords<T[]> | undefined>(undefined)

  const restore = async (records: DeviceRecords<T[]>) => {
    const list = await records.read(key)
    if (list && loaded.get() === undefined) loaded.set(list)
  }

  ctx.watch(deviceCache, found => {
    const records = found?.records<T[]>('bots')
    kept.set(records)
    if (records) void restore(records)
  })
  owned(ctx, () =>
    effect(() => {
      const list = loaded.get()
      if (list) kept.get()?.write(key, list)
    }),
  )

  const greeted = () => loaded.set(ctx.wire.hello(hello) ?? [])
  ctx.on(wireHello, greeted)
  if (ctx.wire.ready()) greeted()
  ctx.effect(() => joinDisposers(ctx.wire.on(change, keep), ctx.wire.on(remove, drop)))

  return { list: sorted, find: (id: string) => loaded.get()?.find(item => item.id === id), keep, drop }
}

export const botStore = (ctx: BotsContext) => {
  const bots = syncedList<BotSummary>(ctx, { key: 'list', hello: helloBots, change: botChangeWire, remove: botRemoveWire })
  const folders = syncedList<BotFolder>(ctx, { key: 'folders', hello: helloBotFolders, change: botFolderChangeWire, remove: botFolderRemoveWire })

  return {
    bots: bots.list,
    find: bots.find,
    create: (spec: NewBot) => ctx.wire.call(botCreate, spec).then(bots.keep),
    update: (bot: string, patch: BotPatch) => ctx.wire.call(botUpdate, { bot, patch }).then(bots.keep),
    move: (bot: string, folder: string | null) => ctx.wire.call(botMove, { bot, folder }).then(bots.keep),
    remove: (bot: string) => ctx.wire.call(botDelete, { bot }).then(() => bots.drop(bot)),
    folders: {
      list: folders.list,
      create: (name: string) => ctx.wire.call(botFolderCreate, { name }).then(folders.keep),
      rename: (folder: string, name: string) => ctx.wire.call(botFolderRename, { folder, name }).then(folders.keep),
      remove: (folder: string) => ctx.wire.call(botFolderDelete, { folder }).then(() => folders.drop(folder)),
    },
    jobs: {
      create: (bot: string, spec: Omit<NewJob, 'bot'>) => ctx.wire.call(jobCreate, { bot, ...spec }),
      update: (job: string, patch: JobPatch) => ctx.wire.call(jobUpdate, { job, patch }),
      remove: (job: string) => ctx.wire.call(jobDelete, { job }),
    },
  }
}

export type BotStore = ReturnType<typeof botStore>
