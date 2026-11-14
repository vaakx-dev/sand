import { bytes } from '@sand/util'
import { effect, input, type Derive, type Sig } from '@vaakx-dev/vrui'
import { mediaView } from '@sand/media/web/contract'
import { helloAttachments } from '../contract'
import type { ShelfContext } from './context'
import type { Held, Shelf, ShelfPlace } from './contract'
import { drops } from './drop'
import type { Uploads } from './uploads'
import { shelfView, type Tray } from './view'

const fallbackUploadBytes = 1024 ** 3

const pasteLimit = 32 * 1024

const pastedFile = (text: string) => new File([text], 'Pasted text.txt', { type: 'text/plain' })

export const uploadLimit = (ctx: ShelfContext) => ctx.wire.hello(helloAttachments)?.uploadBytes ?? fallbackUploadBytes

export const createShelf = (ctx: ShelfContext, attachable: Derive<boolean>, uploads: Uploads, items: Sig<Held[]>, place: ShelfPlace): Shelf => {
  const tooLarge = (item: Held) => item instanceof File && item.size > uploadLimit(ctx)
  const add = (files: Iterable<File>) => items.update(list => [...list, ...files])
  const files = () => items.get().filter((item): item is File => item instanceof File && !tooLarge(item))

  effect(() => {
    const device = place.device()
    if (attachable.get()) for (const file of files()) uploads.start(file, device)
  })

  const tray: Tray = {
    items,
    thread: place.thread,
    tooLarge: item => (tooLarge(item) ? `Larger than ${bytes(uploadLimit(ctx))}` : undefined),
    upload: file => uploads.state(file, place.device()),
    retry: file => uploads.retry(file, place.device()),
    remove(item) {
      if (item instanceof File) uploads.cancel(item)
      items.update(list => list.filter(other => other !== item))
    },
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
