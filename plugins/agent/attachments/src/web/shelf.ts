import type { UserContent } from '@sand/chats/contract'
import { mediaView } from '@sand/media/web/contract'
import { bytes, errorMessage } from '@sand/util'
import { input, sig, type Derive, type Sig } from '@vaakx-dev/vrui'
import { helloAttachments } from '../contract'
import type { ShelfContext } from './context'
import type { Held, Shelf, ShelfPlace } from './contract'
import { drops } from './drop'
import { uploadFile } from './upload'
import { shelfView, type Tray } from './view'

const fallbackUploadBytes = 1024 ** 3

const pasteLimit = 32 * 1024

const pastedFile = (text: string) => new File([text], 'Pasted text.txt', { type: 'text/plain' })

const withEntry = <V>(map: Map<File, V>, file: File, value: V | undefined) => {
  const next = new Map(map)
  if (value === undefined) next.delete(file)
  else next.set(file, value)
  return next
}

export const createShelf = (ctx: ShelfContext, attachable: Derive<boolean>, items: Sig<Held[]>, place: ShelfPlace): Shelf => {
  const sent = sig(new Map<File, number>())
  const failed = sig(new Map<File, string>())
  const uploaded = new WeakMap<File, UserContent>()
  const limit = () => ctx.wire.hello(helloAttachments)?.uploadBytes ?? fallbackUploadBytes
  const tooLarge = (item: Held) => item instanceof File && item.size > limit()
  const add = (files: Iterable<File>) => items.update(list => [...list, ...files])

  const tray: Tray = {
    items,
    thread: place.thread,
    errorOf(item) {
      if (!(item instanceof File)) return undefined
      return tooLarge(item) ? `Larger than ${bytes(limit())}` : failed.get().get(item)
    },
    sentOf: item => (item instanceof File ? sent.get().get(item) : undefined),
    remove: item => items.update(list => list.filter(other => other !== item)),
  }

  const send = async (file: File) => {
    if (uploaded.has(file) || tooLarge(file)) return
    failed.update(map => withEntry(map, file, undefined))
    sent.update(map => withEntry(map, file, 0))
    try {
      const content = await uploadFile(ctx.wire, place.device(), file, done => sent.update(map => withEntry(map, file, done)))
      uploaded.set(file, content)
      if (content.type === 'image') ctx.get(mediaView)?.remember(content.hash, file)
    } catch (error) {
      failed.update(map => withEntry(map, file, `Upload failed: ${errorMessage(error)}`))
    } finally {
      sent.update(map => withEntry(map, file, undefined))
    }
  }

  const pickers: HTMLInputElement[] = []
  const filePicker = () => {
    const picker = input({
      type: 'file',
      multiple: true,
      hidden: true,
      onChange: () => {
        add(picker.files ?? [])
        picker.value = ''
      },
      onMount: () => {
        pickers.push(picker)
        return () => {
          pickers.splice(pickers.indexOf(picker), 1)
        }
      },
    })
    return picker
  }

  return {
    attachable: () => attachable.get(),
    rejected: () => items.get().some(tooLarge),
    async upload(held) {
      await Promise.all(held.flatMap(item => (item instanceof File ? [send(item)] : [])))
      const content = held.flatMap(item => (item instanceof File ? (uploaded.get(item) ?? []) : [item]))
      if (content.length < held.length) throw new Error('a file could not be uploaded')
      return content
    },
    pick: () => pickers.at(-1)?.click(),
    paste(text) {
      if (text.length <= pasteLimit || !attachable.get()) return false
      add([pastedFile(text)])
      return true
    },
    view: () => shelfView({ kit: ctx.kit, media: ctx.get(mediaView), tray, picker: filePicker() }),
    drops: area => drops(ctx.kit, { attachable: () => attachable.get(), add }, area),
  }
}
