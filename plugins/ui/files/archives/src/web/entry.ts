interface Entry {
  path: string
  size: number
  modified: number
  unpack(): Promise<Uint8Array<ArrayBuffer>>
}

interface Listing {
  kind: 'listing'
  entries: Entry[]
  folders: string[]
}

const cleanPath = (raw: string) =>
  raw
    .replaceAll('\\', '/')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/')

export { cleanPath, type Entry, type Listing }
