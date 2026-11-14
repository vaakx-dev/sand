import { moveFresh } from '@sand/util/fs'
import { open, rm, stat } from 'node:fs/promises'

interface Source {
  url: string
  bytes: number
  sha256: string
}

type Step = { status: 'checking' } | { status: 'downloading'; done: number; total: number }

interface DownloadOptions {
  source: Source
  file: string
  signal: AbortSignal
  progress(step: Step): void
}

interface Fetched {
  done: number
  sha256: string
}

const PARTIAL = 206

const partSize = async (part: string, bytes: number) => {
  const size = await stat(part).then(info => info.size, () => 0)
  if (size <= bytes) return size
  await rm(part, { force: true })
  return 0
}

const hasherOf = async (part: string, have: number, progress: DownloadOptions['progress']) => {
  const hasher = new Bun.CryptoHasher('sha256')
  if (!have) return hasher
  progress({ status: 'checking' })
  for await (const chunk of Bun.file(part).stream()) hasher.update(chunk)
  return hasher
}

const request = async (url: string, from: number, signal: AbortSignal) => {
  const response = await fetch(url, { headers: { 'user-agent': 'sand', ...(from && { range: `bytes=${from}-` }) }, signal })
  if (!response.ok || !response.body) throw new Error(`The download answered HTTP ${response.status}`)
  return { partial: response.status === PARTIAL, body: response.body }
}

const write = async (body: ReadableStream<Uint8Array>, part: string, from: number, hasher: Bun.CryptoHasher, moved: (done: number) => void) => {
  const handle = await open(part, from ? 'a' : 'w')
  let done = from
  try {
    for await (const chunk of body) {
      await handle.write(chunk)
      hasher.update(chunk)
      done += chunk.length
      moved(done)
    }
  } finally {
    await handle.close()
  }
  return done
}

const fetchFrom = async (options: DownloadOptions, part: string, have: number): Promise<Fetched> => {
  const { source, progress, signal } = options
  const hasher = await hasherOf(part, have, progress)
  if (have === source.bytes) return { done: have, sha256: hasher.digest('hex') }
  const { partial, body } = await request(source.url, have, signal)
  if (have && !partial) {
    await body.cancel()
    return fetchFrom(options, part, 0)
  }
  const moved = (done: number) => progress({ status: 'downloading', done, total: source.bytes })
  moved(have)
  const done = await write(body, part, have, hasher, moved)
  return { done, sha256: hasher.digest('hex') }
}

const download = async (options: DownloadOptions) => {
  const { source, file } = options
  const part = `${file}.part`
  const fetched = await fetchFrom(options, part, await partSize(part, source.bytes))
  if (fetched.done !== source.bytes || fetched.sha256 !== source.sha256) {
    await rm(part, { force: true })
    throw new Error("The download didn't match what sand expected, so sand deleted it. Try again.")
  }
  await moveFresh(part, file)
}

export { download, type Source, type Step }
