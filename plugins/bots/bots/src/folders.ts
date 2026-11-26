import type { Ledger } from '@sand/ledger/contract'
import { uuid } from '@sand/util'
import type { BotFolder, BotFolders } from './contract'

export interface FolderHooks {
  changed(folder: BotFolder): void
  removed(id: string, unfiled: string[]): void
}

export const createFolders = ({ db, tx }: Ledger, hooks: FolderHooks) => {
  const all = db.query<BotFolder, []>('select id, name, created from bot_folders order by created')
  const one = db.query<BotFolder, { id: string }>('select id, name, created from bot_folders where id = $id')
  const insert = db.query<unknown, [string, string, number]>('insert into bot_folders (id, name, created) values (?, ?, ?)')
  const renamed = db.query<unknown, { id: string; name: string }>('update bot_folders set name = $name where id = $id')
  const filed = db.query<{ id: string }, { folder: string }>('select id from bots where folder_id = $folder')
  const unfile = db.query<unknown, { folder: string }>('update bots set folder_id = null where folder_id = $folder')
  const removed = db.query<unknown, { id: string }>('delete from bot_folders where id = $id')

  const known = (id: string) => {
    const folder = one.get({ id })
    if (!folder) throw new Error(`No bot folder ${id}`)
    return folder
  }

  const changed = (folder: BotFolder) => {
    hooks.changed(folder)
    return folder
  }

  const service: BotFolders = {
    list: () => all.all(),
    create(name) {
      const folder = { id: uuid(), name, created: Date.now() }
      insert.run(folder.id, folder.name, folder.created)
      return changed(folder)
    },
    rename(id, name) {
      const folder = { ...known(id), name }
      renamed.run({ id, name })
      return changed(folder)
    },
    remove(id) {
      if (!one.get({ id })) return false
      const unfiled = filed.all({ folder: id }).map(bot => bot.id)
      tx(() => {
        unfile.run({ folder: id })
        removed.run({ id })
      })
      hooks.removed(id, unfiled)
      return true
    },
  }

  return { service, known: (id: string) => known(id).id }
}
