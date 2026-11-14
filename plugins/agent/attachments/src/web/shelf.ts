import { bytes } from '@sand/util'
import { effect, input, span, type Derive, type Props, type Sig } from '@vaakx-dev/vrui'
import { mediaView } from '@sand/media/web/contract'
import { helloAttachments } from '../contract'
import type { ShelfContext } from './context'
import type { Held, PickSource, Shelf, ShelfPlace } from './contract'
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

  const pickers: Record<PickSource, HTMLInputElement>[] = []
  const picker = (props: Props<HTMLInputElement>) => {
    const found = input({
      ...props,
      type: 'file',
      hidden: true,
      onChange: () => {
        add(found.files ?? [])
        found.value = ''
      },
    })
    return found
  }
  const filePickers = () => {
    const shown = {
      files: picker({ multiple: true }),
      camera: picker({ accept: 'image/*', capture: 'environment' }),
      library: picker({ accept: 'image/*,video/*', multiple: true }),
    }
    return span(
      {
        hidden: true,
        onMount: () => {
          pickers.push(shown)
          return () => {
            pickers.splice(pickers.indexOf(shown), 1)
          }
        },
      },
      shown.files,
      shown.camera,
      shown.library,
    )
  }

  return {
    attachable: () => attachable.get(),
    rejected: () => items.get().some(tooLarge),
    pick: (source = 'files') => pickers.at(-1)?.[source].click(),
    paste(text) {
      if (text.length <= pasteLimit || !attachable.get()) return false
      add([pastedFile(text)])
      return true
    },
    view: () => shelfView({ kit: ctx.kit, media: ctx.get(mediaView), tray, picker: filePickers() }),
    drops: area => drops(ctx.kit, { attachable: () => attachable.get(), add }, area),
  }
}
