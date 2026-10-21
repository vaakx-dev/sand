import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Attachments } from '@sand/attachments/contract'
import type { ToolResultContent } from '@sand/chats/contract'
import type { Artifact, Orrin } from '@sand/orrin/contract'
import { errorMessage } from '@sand/util'

const maxShown = 6
const maxShownBytes = 5_000_000
const maxSaved = 40
const maxSavedBytes = 25_000_000

interface Plan {
  job: string
  artifact: Artifact
  skipped?: string
  show: boolean
}

interface Loaded {
  line: string
  images: ToolResultContent[]
}

const decodedSize = (base64: string) => Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)

const savedPath = (job: string, artifactPath: string) => {
  const segments = artifactPath
    .split(/[\\/]+/)
    .filter(segment => segment && segment !== '.' && segment !== '..')
    .map(segment => segment.replaceAll(':', '_'))
  return join(tmpdir(), 'sand-orrin-jobs', job, ...segments)
}

const skipReason = (artifact: Artifact, index: number) => {
  if (artifact.size > maxSavedBytes) return `too big (over ${maxSavedBytes / 1_000_000} MB)`
  if (index >= maxSaved) return `too many artifacts (only the first ${maxSaved} are saved)`
  return undefined
}

const load = async (orrin: Orrin, attachments: Attachments, { job, artifact, skipped, show }: Plan, signal: AbortSignal): Promise<Loaded> => {
  const base = `- ${artifact.path} (${artifact.size} bytes)`
  if (skipped && !show) return { line: `${base}, not saved: ${skipped}`, images: [] }
  try {
    const { data } = await orrin.call('objects.get', { hash: artifact.hash }, signal)
    if (decodedSize(data) !== artifact.size) return { line: `${base}, not saved: content did not match its size`, images: [] }
    const images = show ? [await attachments.fromBytes(Buffer.from(data, 'base64'), artifact.path)] : []
    if (skipped) return { line: `${base}, not saved: ${skipped}`, images }
    const path = savedPath(job, artifact.path)
    await Bun.write(path, Buffer.from(data, 'base64'))
    return { line: `${base}, saved to ${path}`, images }
  } catch (error) {
    return { line: `${base}, could not load: ${errorMessage(error)}`, images: [] }
  }
}

export const keepArtifacts = async (orrin: Orrin, attachments: Attachments, job: string, artifacts: Artifact[], signal: AbortSignal) => {
  const shown = new Set(artifacts.filter(artifact => attachments.isMedia(artifact.path) && artifact.size <= maxShownBytes).slice(0, maxShown))
  const plans = artifacts.map((artifact, index): Plan => ({ job, artifact, skipped: skipReason(artifact, index), show: shown.has(artifact) }))
  const loaded: Loaded[] = []
  for (const plan of plans) loaded.push(await load(orrin, attachments, plan, signal))
  const list = loaded.length ? `Artifacts:\n${loaded.map(({ line }) => line).join('\n')}` : ''
  return { list, images: loaded.flatMap(({ images }) => images) }
}
