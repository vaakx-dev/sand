import { type GitHub, type PullRef, pullVariables } from '@sand/github/contract'

export type RestFileStatus = 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'

export interface RestFile {
  filename: string
  previous_filename?: string
  status: RestFileStatus
  additions: number
  deletions: number
  changes: number
  patch?: string
}

export interface FileSource extends PullRef {
  commit?: string
}

export const movedFrom = (file: RestFile) => (file.previous_filename && file.previous_filename !== file.filename ? { from: file.previous_filename } : {})

export const isBinary = (file: RestFile) => file.patch === undefined && file.changes === 0 && file.status !== 'renamed'

const perPage = 100
const maxFiles = 3000

const pageUrl = ({ repo, number, commit }: FileSource, page: number) => {
  const { owner, name } = pullVariables({ repo, number })
  const query = `per_page=${perPage}&page=${page}`
  return commit ? `/repos/${owner}/${name}/commits/${encodeURIComponent(commit)}?${query}` : `/repos/${owner}/${name}/pulls/${number}/files?${query}`
}

const readPage = async (github: GitHub, source: FileSource, page: number) => {
  if (!source.commit) return github.rest<RestFile[]>('GET', pageUrl(source, page))
  const commit = await github.rest<{ files?: RestFile[] }>('GET', pageUrl(source, page))
  return commit.files ?? []
}

async function* filePages(github: GitHub, source: FileSource) {
  for (let page = 1; page * perPage <= maxFiles; page++) {
    const files = await readPage(github, source, page)
    yield files
    if (files.length < perPage) return
  }
}

export const listFiles = async (github: GitHub, source: FileSource) => {
  const files: RestFile[] = []
  for await (const page of filePages(github, source)) files.push(...page)
  return files
}

export const findFile = async (github: GitHub, source: FileSource, path: string) => {
  for await (const page of filePages(github, source)) {
    const found = page.find(file => file.filename === path)
    if (found) return found
  }
  return undefined
}
