import { writeAtomic } from '@sand/util/fs'
import { addonCatalogAsset } from '@sand/util/release'
import { join } from 'node:path'
import { z } from 'zod'

type Saved = { kind: 'github'; repo: string } | { kind: 'url'; url: string }

interface Source {
  id: string
  label: string
  removable: boolean
  url(): Promise<string>
}

const FILE = 'addon-sources.json'

const REPO = /^[\w.-]+\/[\w.-]+$/

const GITHUB_REPO = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/

const savedSchema = z.object({
  sources: z.array(z.discriminatedUnion('kind', [z.object({ kind: z.literal('github'), repo: z.string().regex(REPO) }), z.object({ kind: z.literal('url'), url: z.url() })])),
})

const githubCatalog = (repo: string) => `https://github.com/${repo}/releases/latest/download/${addonCatalogAsset}`

const catalogAt = (address: string) => (new URL(address).pathname.endsWith('.json') ? address : `${address.replace(/\/+$/, '')}/${addonCatalogAsset}`)

const parseSource = (text: string): Saved => {
  const given = text.trim()
  const repo = REPO.test(given) ? given : GITHUB_REPO.exec(given)?.[1]
  if (repo) return { kind: 'github', repo }
  if (!/^https?:\/\//i.test(given) || !URL.canParse(given)) throw new Error('Give a GitHub repository like owner/name, or the https:// address of a catalog')
  return { kind: 'url', url: catalogAt(given) }
}

const sourceOf = (saved: Saved): Source => {
  if (saved.kind === 'github') return { id: saved.repo.toLowerCase(), label: saved.repo, removable: true, url: async () => githubCatalog(saved.repo) }
  return { id: saved.url, label: new URL(saved.url).host, removable: true, url: async () => saved.url }
}

const sourceStore = (home: string) => {
  const file = join(home, FILE)
  const read = async (): Promise<Saved[]> => {
    const parsed = savedSchema.safeParse(
      await Bun.file(file)
        .json()
        .catch(() => undefined),
    )
    return parsed.success ? parsed.data.sources : []
  }
  const write = (sources: Saved[]) => writeAtomic(file, `${JSON.stringify({ sources }, null, 2)}\n`)
  return { read, write }
}

export { parseSource, sourceOf, sourceStore, type Saved, type Source }
