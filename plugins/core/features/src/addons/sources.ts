import { writeAtomic } from '@sand/util/fs'
import { addonCatalogAsset } from '@sand/util/release'
import { join } from 'node:path'
import { z } from 'zod'

type Saved = { kind: 'github'; repo: string } | { kind: 'site'; site: string }

interface Source {
  id: string
  label: string
  removable: boolean
  url(): Promise<string>
}

const FILE = 'addon-sources.json'

const REPO = /^[\w.-]+\/[\w.-]+$/

const GITHUB_REPO = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i

const ADDRESS = 'Give a GitHub repository like owner/repo, or the address of an add-on server like addons.example.org'

const savedSchema = z.object({
  sources: z.array(
    z.discriminatedUnion('kind', [z.object({ kind: z.literal('github'), repo: z.string().regex(REPO) }), z.object({ kind: z.literal('site'), site: z.url() })]),
  ),
})

const githubCatalog = (repo: string) => `https://github.com/${repo}/releases/latest/download/${addonCatalogAsset}`

const siteOf = (given: string) => {
  const address = /^https?:\/\//i.test(given) ? given : `https://${given}`
  if (!URL.canParse(address)) throw new Error(ADDRESS)
  const url = new URL(address)
  if (url.pathname !== '/' || url.search || url.hash) throw new Error(`${ADDRESS}, without a path`)
  return url.origin
}

const parseSource = (text: string): Saved => {
  const given = text.trim()
  const repo = GITHUB_REPO.exec(given)?.[1] ?? (REPO.test(given) ? given : undefined)
  if (repo) return { kind: 'github', repo }
  return { kind: 'site', site: siteOf(given) }
}

const sourceOf = (saved: Saved): Source => {
  if (saved.kind === 'github') return { id: saved.repo.toLowerCase(), label: saved.repo, removable: true, url: async () => githubCatalog(saved.repo) }
  return { id: saved.site, label: new URL(saved.site).host, removable: true, url: async () => `${saved.site}/${addonCatalogAsset}` }
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
