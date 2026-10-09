import { realpath } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, sep } from 'node:path'

const entries = (root: string) => [join(root, 'apps', 'sand', 'src', 'main.ts'), join(root, 'apps', 'sand', 'src', 'host', 'run.ts')]

const loaders: Record<string, 'ts' | 'tsx' | 'js' | 'jsx'> = {
  '.ts': 'ts', '.mts': 'ts', '.cts': 'ts', '.tsx': 'tsx', '.js': 'js', '.mjs': 'js', '.cjs': 'js', '.jsx': 'jsx',
}

const transpilers = new Map<string, Bun.Transpiler>()

const scan = (file: string, code: string) => {
  const loader = loaders[extname(file)]
  if (!loader) return []
  let transpiler = transpilers.get(loader)
  if (!transpiler) transpilers.set(loader, transpiler = new Bun.Transpiler({ loader }))
  return transpiler.scanImports(code.replace(/^#!.*/, '')).map(item => item.path)
}

const inside = (root: string, path: string) => {
  const rel = relative(root, path)
  return !!rel && !rel.startsWith('..') && !isAbsolute(rel) && !rel.split(sep).includes('node_modules')
}

const resolve = async (spec: string, from: string) => {
  try {
    const path = Bun.resolveSync(spec, dirname(from))
    return isAbsolute(path) ? await realpath(path) : undefined
  } catch {
    return undefined
  }
}

const readBytes = async (path: string) => {
  const file = Bun.file(path)
  return (await file.exists()) ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array()
}

const walk = async (root: string) => {
  const files = new Map<string, Uint8Array>()
  const external = new Set<string>()
  let queue = await Promise.all(entries(root).map(file => realpath(file)))
  for (const file of queue) files.set(file, new Uint8Array())
  while (queue.length) {
    const found = await Promise.all(queue.map(async file => {
      const bytes = new Uint8Array(await Bun.file(file).arrayBuffer())
      files.set(file, bytes)
      return Promise.all(scan(file, new TextDecoder().decode(bytes)).map(async spec => {
        const path = await resolve(spec, file)
        if (path && inside(root, path)) return path
        external.add(spec)
        return undefined
      }))
    }))
    queue = []
    for (const path of found.flat()) {
      if (!path || files.has(path)) continue
      files.set(path, new Uint8Array())
      queue.push(path)
    }
  }
  return { files, external }
}

const hostCodeHash = async (root: string): Promise<string> => {
  const real = await realpath(root)
  const { files, external } = await walk(real)
  const hasher = new Bun.CryptoHasher('sha256')
  const rows = [...files].map(([path, bytes]) => ({ name: relative(real, path).split(sep).join('/'), bytes }))
  rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const { name, bytes } of rows) hasher.update(`file\0${name}\0${bytes.length}\0`).update(bytes)
  for (const spec of [...external].sort()) hasher.update(`external\0${spec}\0`)
  for (const name of ['bun.lock', 'package.json']) {
    const bytes = await readBytes(join(real, name))
    hasher.update(`root\0${name}\0${bytes.length}\0`).update(bytes)
  }
  return hasher.digest('hex')
}

export const hostCodeChanged = async (running: string, next: string): Promise<boolean> => {
  if (running === next) return false
  const [a, b] = await Promise.all([hostCodeHash(running), hostCodeHash(next)])
  return a !== b
}
