import { sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import { extensionOf, type FileFormat, type FoundFile, formatAddons } from '../contract'

const ADDON_EXTENSIONS = new Set(Object.values(formatAddons).flatMap(addon => addon.extensions))

const formatRegistry = (text: FileFormat) => {
  const registered = sig<FileFormat[]>([text])

  const add = (format: FileFormat): Dispose => {
    registered.update(all => [format, ...all])
    return () => registered.update(all => all.filter(other => other !== format))
  }

  const byExtension = (extension: string) => registered.get().find(format => format.extensions.includes(extension))

  const formatOf = (file: FoundFile) => {
    const extension = extensionOf(file.name)
    const found = byExtension(extension)
    if (found || ADDON_EXTENSIONS.has(extension)) return found
    return file.text ? text : undefined
  }

  const known = (extension: string) => ADDON_EXTENSIONS.has(extension) || Boolean(byExtension(extension))

  return { add, formatOf, known }
}

type Formats = ReturnType<typeof formatRegistry>

export { formatRegistry, type Formats }
