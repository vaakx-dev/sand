import type { Box, Screenshot, UiElement } from '@sand/computers/contract'
import { bucketOf, buckets, type Bucket } from '../score'
import { page, type Theme } from './pages'
import { random } from './random'
import { renderer, type Candidate } from './render'
import { loadShot, pickShots } from './screenspot'

export type Source = 'synthetic' | 'screenspot'

export interface Sample {
  id: string
  source: Source
  page: string
  kind: string
  description: string
  box: Box
  screenshot: Screenshot
  elements: UiElement[]
  bucket: Bucket
}

const viewports = [
  { width: 3840, height: 2160 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
  { width: 1920, height: 1080 },
]

const themes: Theme[] = ['light', 'dark']

const perPage = 3
const mostPages = 80

const kindOf = (candidate: Candidate) => (candidate.clipped ? 'clipped' : candidate.kind)

const priority = ['clipped', 'look-alike', 'context', 'tiny', 'calendar', 'switch', 'icon', 'text', 'field', 'large']

const varied = (candidates: Candidate[]) => {
  const kinds = [...Map.groupBy(candidates, kindOf)].sort(([a], [b]) => priority.indexOf(a) - priority.indexOf(b)).map(([, group]) => group)
  return kinds.flatMap((_, round) => kinds.flatMap(kind => kind[round] ?? [])).concat(kinds.flatMap(kind => kind.slice(kinds.length)))
}

const synthetic = async (perBucket: number, seed: number) => {
  const browser = await renderer()
  const picked = new Map<Bucket, Sample[]>(buckets.map(bucket => [bucket, []]))
  const short = () => buckets.some(bucket => picked.get(bucket)!.length < perBucket)
  try {
    for (let index = 0; short(); index++) {
      if (index === mostPages) throw new Error(`${mostPages} pages did not fill every size bucket`)
      const r = random(seed * 1000 + index)
      const viewport = viewports[index % viewports.length]!
      const theme = themes[Math.floor(index / viewports.length) % themes.length]!
      const rendered = await browser.render(page(r, theme), viewport.width, viewport.height)
      const screenshot = { png: rendered.png, ...viewport }
      const id = `page${index + 1}`
      for (const [bucket, group] of Map.groupBy(r.shuffle(rendered.candidates), candidate => bucketOf(candidate.pixels))) {
        const room = perBucket - picked.get(bucket)!.length
        for (const candidate of varied(group).slice(0, Math.min(perPage, room)))
          picked.get(bucket)!.push({ id: `${id}-${candidate.ref}`, source: 'synthetic', page: id, kind: kindOf(candidate), description: candidate.description, box: candidate.box, screenshot, elements: rendered.elements, bucket })
      }
    }
  } finally {
    await browser.close()
  }
  return [...picked.values()]
}

const screenspot = async (perBucket: number, seed: number) => {
  const { shots, entries } = await pickShots(perBucket, random(seed))
  const samples = await Promise.all(
    shots.map(async (shot): Promise<Sample> => {
      const screenshot = await loadShot(shot, entries)
      const [x, y, width, height] = shot.bbox
      const box = { left: x / screenshot.width, top: y / screenshot.height, right: (x + width) / screenshot.width, bottom: (y + height) / screenshot.height }
      return { id: `ss-${shot.id}`, source: 'screenspot', page: shot.image, kind: `${shot.platform} ${shot.type}`, description: shot.instruction, box, screenshot, elements: [], bucket: shot.bucket }
    }),
  )
  return [...Map.groupBy(samples, sample => sample.bucket).values()]
}

const interleaved = (groups: Sample[][]) =>
  groups
    .flatMap(group => group.map((sample, index) => ({ sample, rank: (index + 0.5) / group.length })))
    .sort((a, b) => a.rank - b.rank)
    .map(({ sample }) => sample)

export const generate = async (perBucket: number, screenspotPerBucket: number, seed: number) =>
  interleaved([...(await synthetic(perBucket, seed)), ...(screenspotPerBucket ? await screenspot(screenspotPerBucket, seed) : [])])
