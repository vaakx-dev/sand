import { clip, shortSha, trimSlash } from '@sand/util'

const PULL_REQUEST = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/

const COMMIT = /\/commit\/([0-9a-f]{7,40})\b/i

const PAGE_LABEL_MOST = 32

const pageLabel = (link: string) => {
  if (!URL.canParse(link)) return clip(link, PAGE_LABEL_MOST)
  const url = new URL(link)
  return clip(trimSlash(url.host + url.pathname), PAGE_LABEL_MOST)
}

const linkLabel = (link: string) => {
  if (link.startsWith('thread:')) return 'thread'
  const pullRequest = PULL_REQUEST.exec(link)?.[1]
  if (pullRequest) return `#${pullRequest}`
  const commit = COMMIT.exec(link)?.[1]
  if (commit) return shortSha(commit)
  return pageLabel(link)
}

const linkSource = (link: string) => {
  const label = linkLabel(link).replace(/[[\]]/g, '')
  const target = link.replace(/[()\s<>]/g, encodeURIComponent)
  return `[${label}](${target})`
}

export { linkSource }
