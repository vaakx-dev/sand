import { Zip, type ZipEntry } from '@sand/zip'
import { cleanPath, type Entry, type Listing } from './entry'

const isFolder = (entry: ZipEntry) => /[\/]$/.test(entry.name)

const zipArchive = (data: Uint8Array<ArrayBuffer>): Listing => {
  const zip = new Zip(data, { totalBytes: Number.POSITIVE_INFINITY })
  const entries: Entry[] = zip.entries
    .filter(entry => !isFolder(entry))
    .map(entry => ({ path: cleanPath(entry.name), size: entry.size, modified: entry.modified, unpack: () => zip.bytes(entry.name) }))
    .filter(entry => entry.path)
  const folders = zip.entries.filter(isFolder).map(entry => cleanPath(entry.name)).filter(Boolean)
  return { kind: 'listing', entries, folders }
}

export { zipArchive }
