import { errorMessage } from '@sand/util'
import { chmod, mkdir, open, rm, symlink, utimes } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { type ByteReader, byteReader } from './bytes'
import { block, type Header, padding, type Pax, readHeader, readPax, textOf } from './header'

const fileFlags = new Set(['0', '\u0000', '7'])

const umask = process.umask()

const placeOf = (root: string, name: string, links: Set<string>) => {
  const rel = relative(root, resolve(root, name))
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`The copy holds ${name}, which is outside its folder`)
  for (let parent = dirname(rel); parent !== '.'; parent = dirname(parent))
    if (links.has(parent)) throw new Error(`The copy puts ${name} inside the link ${parent}`)
  return rel
}

const linkFailed = (name: string, error: unknown) => {
  const denied = error instanceof Error && 'code' in error && error.code === 'EPERM'
  if (denied && process.platform === 'win32')
    return new Error(`Couldn't create the link ${name}: Windows lets sand create links only with Developer Mode on, or when sand runs as administrator`)
  return new Error(`Couldn't create the link ${name}: ${errorMessage(error)}`)
}

const writeFile = async (input: ByteReader, path: string, { size, mode, mtime }: Header) => {
  const handle = await open(path, 'w')
  try {
    for await (const part of input.parts(size)) await handle.write(part)
  } finally {
    await handle.close()
  }
  await utimes(path, mtime, mtime)
  await chmod(path, mode & ~umask)
}

const place = async (input: ByteReader, root: string, entry: Header, links: Set<string>) => {
  const rel = placeOf(root, entry.name, links)
  const path = join(root, rel)
  if (entry.flag === '5') return void (await mkdir(path, { recursive: true }))
  const file = fileFlags.has(entry.flag)
  if (!file && entry.flag !== '2') throw new Error(`The copy holds ${entry.name}, a kind of entry that can't be copied`)
  if (!rel) throw new Error(`The copy holds ${entry.name} where its folder should be`)
  await mkdir(dirname(path), { recursive: true })
  await rm(path, { force: true })
  if (file) return writeFile(input, path, entry)
  await symlink(entry.link, path).catch(error => {
    throw linkFailed(entry.name, error)
  })
  links.add(rel)
}

const extended: Record<string, (body: Uint8Array) => Pax> = {
  x: readPax,
  g: () => ({}),
  L: body => ({ path: textOf(body) }),
  K: body => ({ linkpath: textOf(body) }),
}

const withPax = (header: Header, pax: Pax): Header => ({
  ...header,
  name: pax.path ?? header.name,
  link: pax.linkpath ?? header.link,
  size: pax.size === undefined ? header.size : Number(pax.size),
})

const extract = async (input: ByteReader, root: string) => {
  const links = new Set<string>()
  let pax: Pax = {}
  for (let header = readHeader(await input.take(block)); header; header = readHeader(await input.take(block))) {
    const fields = extended[header.flag]
    if (fields) {
      pax = { ...pax, ...fields(await input.take(header.size)) }
      await input.skip(padding(header.size))
      continue
    }
    const entry = withPax(header, pax)
    pax = {}
    await place(input, root, entry, links)
    if (!fileFlags.has(entry.flag)) await input.skip(entry.size)
    await input.skip(padding(entry.size))
  }
}

export const unpack = async (archive: string, root: string) => {
  const input = byteReader(Bun.file(archive).stream())
  try {
    await extract(input, root)
  } finally {
    await input.close()
  }
}
