import { api, repo } from './repo'
import { githubGet } from './request'

export interface ApiAsset {
  name: string
  browser_download_url: string
  size: number
  digest?: string | null
}

export interface ApiRelease {
  tag_name: string
  name: string | null
  draft: boolean
  published_at: string | null
  html_url: string
  assets: ApiAsset[]
}

const apiTimeout = 20_000

const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }

export const repoApi = <T>(path: string) => githubGet<T>(`${api}/repos/${repo}${path}`, apiTimeout, response => response.json() as Promise<T>, headers)
