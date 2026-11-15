import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repo = 'vaakx-dev/sand'
const releasesPath = `/api/repos/${repo}/releases`
const downloadPath = `/gh/${repo}/releases/download/`

interface Published {
  folder: string
  at: string
  without: string[]
}

interface PointOptions {
  without?: string[]
}

const catalogFile = 'sand-addons.json'

const ofAddon = (name: string, id: string) => name.startsWith(`sand-addon-${id}.`) || name.startsWith(`sand-addon-${id}-`)

const sha256 = (content: Uint8Array) => new Bun.CryptoHasher('sha256').update(content).digest('hex')

export const fakeGithub = () => {
  const releases = new Map<string, Published>()
  const missed: string[] = []

  const files = (published: Published) => readdirSync(published.folder).filter(name => !published.without.some(id => ofAddon(name, id)))

  const catalog = (published: Published) => {
    const full: { addons: { id: string }[] } = JSON.parse(readFileSync(join(published.folder, catalogFile), 'utf8'))
    return `${JSON.stringify({ addons: full.addons.filter(addon => !published.without.includes(addon.id)) }, null, 2)}\n`
  }

  const bytes = (published: Published, name: string) => (name === catalogFile ? Buffer.from(catalog(published)) : readFileSync(join(published.folder, name)))

  const releaseJson = (tag: string, published: Published) => ({
    tag_name: tag,
    name: tag,
    draft: false,
    published_at: published.at,
    html_url: `https://github.com/${repo}/releases/tag/${tag}`,
    assets: files(published).map(name => {
      const content = bytes(published, name)
      return {
        name,
        browser_download_url: `https://github.com/${repo}/releases/download/${tag}/${name}`,
        size: content.length,
        digest: `sha256:${sha256(content)}`,
      }
    }),
  })

  const download = (rest: string) => {
    const [tag, name, ...extra] = rest.split('/').map(decodeURIComponent)
    const published = tag ? releases.get(tag) : undefined
    if (!published || !name || extra.length || !files(published).includes(name)) return undefined
    return new Response(bytes(published, name))
  }

  const answer = (url: URL) => {
    const path = url.pathname
    if (path.startsWith(`${releasesPath}/tags/`)) {
      const tag = decodeURIComponent(path.slice(`${releasesPath}/tags/`.length))
      const published = releases.get(tag)
      return published ? Response.json(releaseJson(tag, published)) : undefined
    }
    if (path === releasesPath) return Response.json([...releases].filter(([tag]) => tag.startsWith('v')).map(([tag, published]) => releaseJson(tag, published)))
    if (path.startsWith(downloadPath)) return download(path.slice(downloadPath.length))
  }

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      const found = request.method === 'GET' ? answer(url) : undefined
      if (found) return found
      missed.push(`${request.method} ${url.pathname}${url.search}`)
      return Response.json({ message: 'Not Found' }, { status: 404 })
    },
  })

  const url = `http://127.0.0.1:${server.port}`

  return {
    url,
    missed,
    point(tag: string, folder: string, { without = [] }: PointOptions = {}) {
      releases.set(tag, { folder, at: new Date().toISOString(), without })
    },
    assets: (tag: string) => `${url}${downloadPath}${tag}`,
    stop: () => server.stop(true),
  }
}

export type FakeGithub = ReturnType<typeof fakeGithub>
