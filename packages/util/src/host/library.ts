import { dirname, join } from 'node:path'
import { libraryRoot } from '../text/url'

interface LibraryFiles {
  route: string
  library: string
  files: string[]
  from: string
}

const IMMUTABLE = 'public, max-age=31536000, immutable'

const WORKER_POLICY = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'"

const workerHeaders = (cache: string) => ({ 'cache-control': cache, 'content-security-policy': WORKER_POLICY, 'x-content-type-options': 'nosniff' })

const servedPaths = ({ route, library, files, from }: LibraryFiles) => {
  const manifest = Bun.resolveSync(`${library}/package.json`, from)
  const folder = dirname(manifest)
  const root = libraryRoot(route, require(manifest).version)
  const names = files.flatMap(pattern => [...new Bun.Glob(pattern).scanSync(folder)])
  return new Map(names.map(name => [root + name.replaceAll('\\', '/'), join(folder, name)]))
}

const libraryFiles = (library: LibraryFiles) => {
  const paths = servedPaths(library)
  return (request: Request) => {
    const path = paths.get(new URL(request.url).pathname)
    if (!path) return new Response('not found', { status: 404 })
    return new Response(Bun.file(path), { headers: workerHeaders(IMMUTABLE) })
  }
}

export { libraryFiles, workerHeaders }
