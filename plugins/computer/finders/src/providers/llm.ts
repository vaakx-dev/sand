import type { LLM } from '@sand/accounts/contract'
import type { ModelContent } from '@sand/chats/contract'
import type { Screenshot } from '@sand/computers/contract'
import type { Media } from '@sand/media/contract'
import type { Finder, FinderSpec, LocateInput } from '../contract'
import { answerOf } from './answer'
import { ask } from './ask'
import { elementSystem, question, visionSystem } from './prompt'

export interface Services {
  llm: LLM
  media: Media
}

const longestEdge = 1568
const mostPixels = 1_150_000

const fitted = async (screenshot: Screenshot): Promise<Screenshot> => {
  const { width, height } = screenshot
  const scale = Math.min(1, longestEdge / Math.max(width, height), Math.sqrt(mostPixels / (width * height)))
  if (scale === 1) return screenshot
  const size = { width: Math.round(width * scale), height: Math.round(height * scale) }
  return { png: await new Bun.Image(screenshot.png).resize(size.width, size.height).png().bytes(), ...size }
}

const imageBlock = (media: Media, { png, width, height }: Screenshot): ModelContent => {
  const stored = media.put(png, 'image/png')
  return { type: 'image', mediaType: stored.mediaType, hash: stored.hash, size: stored.size, width, height }
}

const named = ({ model, effort }: FinderSpec) => `${model}${effort ? ` @${effort}` : ''}`

export const llmFinder = ({ llm, media }: Services, spec: FinderSpec): Finder => ({
  id: `llm:${named(spec)}`,
  label: `${named(spec)}, vision`,
  async locate({ screenshot, target, elements = [] }: LocateInput, signal?: AbortSignal) {
    const started = performance.now()
    const image = await fitted(screenshot)
    const content: ModelContent[] = [imageBlock(media, image), { type: 'text', text: question(target, image, elements) }]
    const reply = await ask(llm, { model: spec.model, effort: spec.effort, system: visionSystem, content }, signal)
    return { ...answerOf(reply.text, image, elements), usage: reply.usage, costUsd: reply.costUsd, ms: performance.now() - started }
  },
})

export const elementFinder = ({ llm }: Services, spec: FinderSpec): Finder => ({
  id: `element:${named(spec)}`,
  label: `${named(spec)}, element list`,
  async locate({ screenshot, target, elements = [] }: LocateInput, signal?: AbortSignal) {
    const started = performance.now()
    if (!elements.length) return { hit: null, confidence: null, usage: { inputTokens: 0, outputTokens: 0 }, costUsd: 0, ms: 0 }
    const content: ModelContent[] = [{ type: 'text', text: question(target, screenshot, elements) }]
    const reply = await ask(llm, { model: spec.model, effort: spec.effort, system: elementSystem, content }, signal)
    return { ...answerOf(reply.text, null, elements), usage: reply.usage, costUsd: reply.costUsd, ms: performance.now() - started }
  },
})
