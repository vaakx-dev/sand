import { afterEach, expect, test } from 'bun:test'
import { findRelease } from '../src/github/release'

const STAMP_URL = 'https://github.example/v1.2.0/sand-build.json'
const APK_URL = 'https://github.example/v1.2.0/sand.apk'

const stamp = { id: 'abc1234', time: 1_700_000_000_000, commit: 'f00dfeed', committedAt: 1_764_000_000_000, hash: 'abc1234', modules: 'm', links: {}, bun: '1.3.0' }

const asset = (name: string, url: string, digest?: string) => ({ name, browser_download_url: url, size: 10, digest })

const release = (assets: ReturnType<typeof asset>[]) => ({
  tag_name: 'v1.2.0',
  name: 'v1.2.0',
  draft: false,
  published_at: '2025-11-24T10:00:00Z',
  html_url: 'https://github.example/releases/v1.2.0',
  assets: [asset('sand.tar.gz', 'https://github.example/v1.2.0/sand.tar.gz'), asset('sand-build.json', STAMP_URL), ...assets],
})

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

const serveGithub = (releases: unknown[]) => {
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL) => Response.json(String(input) === STAMP_URL ? stamp : releases), { preconnect: realFetch.preconnect })
}

test('a release that ships the Android app offers its APK, checksum and version code', async () => {
  serveGithub([release([asset('sand.apk', APK_URL, 'sha256:ABCDEF')])])

  expect((await findRelease('release')).android).toEqual({ url: APK_URL, sha256: 'abcdef', versionCode: 1_764_000_000 })
})

test('a release without an APK offers no Android update', async () => {
  serveGithub([release([])])

  expect((await findRelease('release')).android).toBeUndefined()
})
